/**
 * Admin API for the Bridge with Signal site — Feishu SSO + organizer actions.
 * (Migrated from app/lambda/admin-api SAM stack to Amplify Gen2.)
 *
 *   GET  /auth/url                → Feishu authorize URL for the login button
 *   POST /auth/callback {code,state} → exchange code, check allowlist, issue session
 *   GET  /api/overview            → counts (submissions by status, speakers, partners)
 *   GET  /api/submissions         → full CFP submission list
 *   POST /api/submissions/status  → {recordId, status: 通过|拒绝|待审核}
 *   POST /api/sync                → invoke feishu-content-sync for instant content refresh
 *   POST /api/notify              → invoke cfp-accept-mailer {"force": true} (skip NOTIFY_AT)
 *   GET  /api/volunteers          → 志愿者报名列表（审核面板）
 *   POST /api/volunteers/status   → {recordId, status: 待审核|通过|拒绝}
 *   POST /api/volunteers/notify   → invoke volunteer-accept-mailer {"force": true}
 *   GET  /api/crm/speakers        → CRM: 讲者列表（嘉宾表）
 *   GET  /api/crm/sponsors        → CRM: 赞助商列表（赞助商表）
 *   POST /api/crm/update          → CRM: {table, recordId, fields} 字段白名单更新
 *   POST /api/upload              → CMS: multipart 上传讲者照片 / 赞助商 Logo → S3 + 回写 CDN URL
 *   POST /cfp/submit              → public CFP form → 投稿表 (honeypot-guarded)
 *   POST /volunteer/submit        → public volunteer form → 志愿者报名表
 *   GET  /volunteer/me?token=…    → 公共：邮件 HMAC token → 本人姓名/岗位/状态（守桥人指引页）
 *   POST /sponsor/submit          → public sponsor form → 赞助商报名表 (JSON 或带 Logo 的 multipart)
 *
 * Auth: stateless HMAC session (Authorization: Bearer …), allowlist by
 * open_id / email. Feishu bitable is the primary store; every accepted
 * submission is also written to the Amplify Data (DynamoDB) tables as a
 * backup copy (best-effort — a backup failure never fails the submission).
 * Zero npm deps: fetch + AWS SDK v3 ship with the Lambda nodejs runtime.
 */
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import {
  makeState,
  checkState,
  makeSession,
  checkSession,
  isAllowed,
  validateSubmission,
  validateVolunteer,
  validateSponsor,
  parseMultipart,
  validateImage,
  sanitizeHttpUrl,
  allowRate,
  countSubmissionsByEmail,
  isHeroTitle,
  MAX_SUBMISSIONS_PER_EMAIL,
  EMAIL_RE,
} from './lib.mjs';

const {
  FEISHU_APP_ID,
  FEISHU_APP_SECRET,
  FEISHU_REDIRECT_URI,
  FEISHU_BITABLE_APP_TOKEN,
  FEISHU_CFP_TABLE_ID,
  FEISHU_SPEAKERS_TABLE_ID = '',
  FEISHU_SPONSORS_TABLE_ID = '',
  FEISHU_VOLUNTEERS_TABLE_ID = '',
  FEISHU_SPONSOR_APPS_TABLE_ID = '',
  FEISHU_SUBSCRIBE_TABLE_ID = '',
  // 讲者表/赞助商表（展示用）若在另一个多维表格，用这个 token 访问；默认与报名表同库
  FEISHU_DISPLAY_APP_TOKEN = '',
  SESSION_SECRET,
  // 与 volunteer-accept-mailer 共用同一个 secret，用于验签指引页 token
  CONFIRM_SECRET = '',
  ALLOWED_OPEN_IDS = '',
  ALLOWED_EMAILS = '',
  CONTENT_SYNC_FUNCTION = '',
  // 发信台（cdkit outbox）。所有对外邮件都经它审批发送
  OUTBOX_FUNCTION = '',
  ASSETS_BUCKET = '',
  ASSETS_CDN_DOMAIN = '',
  // Hero 投稿实时通知（共用 send-email HTTP API，与 mailer 同一通道）
  EMAIL_FROM = '',
  EMAIL_LINK = '',
  EMAIL_KEY = '',
  HERO_NOTIFY_TO = '',
  TEST_TO = '',
  // Amplify Data 备份表（backend.ts 注入表名并授权；留空则跳过双写）
  CFP_TABLE_NAME = '',
  SPONSOR_TABLE_NAME = '',
  VOLUNTEER_TABLE_NAME = '',
} = process.env;

const AUTHORIZE_URL = 'https://accounts.feishu.cn/open-apis/authen/v1/authorize';
const TOKEN_URL = 'https://open.feishu.cn/open-apis/authen/v1/oidc/access_token';
const USERINFO_URL = 'https://open.feishu.cn/open-apis/authen/v1/user_info';
const FEISHU_BASE = 'https://open.feishu.cn/open-apis';

const lambda = new LambdaClient({});
const s3 = new S3Client({});
const ddb = new DynamoDBClient({});

/** Best-effort rate limit store (per warm container). */
const rateStore = new Map();

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

function clientIp(event) {
  return (
    event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    event.requestContext?.http?.sourceIp ||
    'unknown'
  );
}

function parseJsonBody(event) {
  try {
    return { ok: true, data: JSON.parse(event.body ?? '{}') };
  } catch {
    return { ok: false };
  }
}

function checkPublicRate(event, route) {
  const ok = allowRate({
    key: `${route}:${clientIp(event)}`,
    limit: 20,
    windowMs: 60_000,
    store: rateStore,
  });
  return ok ? null : json(429, { error: '提交过于频繁，请稍后再试' });
}

// ——— 守桥人指引页 token ———
// keep in sync with volunteer-accept-mailer/lib.mjs（同一套 HMAC 签名逻辑跨函数复制，
// 邮件/确认成功页里的指引页链接由 mailer 签发，portal 调 /volunteer/me 在这里验签）。

/** confirm links stay valid for 45 days */
const TOKEN_MAX_AGE_MS = 45 * 24 * 3600 * 1000;

function signToken(recordId, secret, now = Date.now()) {
  const ts = Math.floor(now / 1000);
  const sig = createHmac('sha256', secret).update(`vol.${recordId}.${ts}`).digest('base64url');
  return `${recordId}.${ts}.${sig}`;
}

/** @returns recordId when valid & unexpired, else null */
function verifyToken(token, secret, now = Date.now()) {
  const parts = String(token ?? '').split('.');
  if (parts.length !== 3) return null;
  const [recordId, tsStr, sig] = parts;
  const ts = Number(tsStr);
  if (!recordId || !Number.isFinite(ts) || now - ts * 1000 > TOKEN_MAX_AGE_MS) return null;
  const expected = createHmac('sha256', secret).update(`vol.${recordId}.${tsStr}`).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? recordId : null;
}

// ——— Feishu SSO ———

function authorizeUrl() {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', FEISHU_APP_ID);
  url.searchParams.set('redirect_uri', FEISHU_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', makeState(SESSION_SECRET));
  return url.toString();
}

async function exchangeCode(code) {
  // OIDC token endpoint authenticates with an app_access_token (Bearer);
  // Basic client credentials are rejected with code 20014.
  const tokenRes = await fetch(`${FEISHU_BASE}/auth/v3/app_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET }),
  });
  const tokenData = await tokenRes.json();
  if (tokenData.code !== 0) throw new Error(`feishu app token failed: ${tokenData.code} ${tokenData.msg}`);
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8', Authorization: `Bearer ${tokenData.app_access_token}` },
    body: JSON.stringify({ grant_type: 'authorization_code', code }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`feishu token exchange failed: ${data.code} ${data.msg}`);
  return data.data.access_token;
}

async function fetchUser(userToken) {
  const res = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${userToken}` } });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`feishu user_info failed: ${data.code} ${data.msg}`);
  const u = data.data;
  return { openId: u.open_id ?? u.sub, name: u.name ?? '', picture: u.picture ?? '', email: u.email ?? '' };
}

// ——— bitable (tenant token, read + write) ———

let tokenCache = null;

async function tenantToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.value;
  const res = await fetch(`${FEISHU_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`feishu auth failed: ${data.code} ${data.msg}`);
  tokenCache = { value: data.tenant_access_token, expiresAt: Date.now() + (data.expire - 300) * 1000 };
  return tokenCache.value;
}

const DISPLAY_APP_TOKEN = FEISHU_DISPLAY_APP_TOKEN || FEISHU_BITABLE_APP_TOKEN;

async function listRecords(tableId, appToken = FEISHU_BITABLE_APP_TOKEN) {
  const token = await tenantToken();
  const items = [];
  let pageToken;
  do {
    const url = new URL(`${FEISHU_BASE}/bitable/v1/apps/${appToken}/tables/${tableId}/records`);
    url.searchParams.set('page_size', '100');
    if (pageToken) url.searchParams.set('page_token', pageToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.code !== 0) throw new Error(`feishu records failed: ${data.code} ${data.msg}`);
    items.push(...(data.data?.items ?? []));
    pageToken = data.data?.has_more ? data.data.page_token : undefined;
  } while (pageToken);
  return items;
}

async function updateRecord(tableId, recordId, fields, appToken = FEISHU_BITABLE_APP_TOKEN) {
  const token = await tenantToken();
  const res = await fetch(
    `${FEISHU_BASE}/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
    { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) },
  );
  const data = await res.json();
  if (data.code !== 0) throw new Error(`feishu update failed: ${data.code} ${data.msg}`);
}

async function createRecord(tableId, fields) {
  const token = await tenantToken();
  const res = await fetch(`${FEISHU_BASE}/bitable/v1/apps/${FEISHU_BITABLE_APP_TOKEN}/tables/${tableId}/records`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`feishu create failed: ${data.code} ${data.msg}`);
  return data.data?.record?.record_id ?? '';
}

async function getRecord(tableId, recordId, appToken = FEISHU_BITABLE_APP_TOKEN) {
  const token = await tenantToken();
  const res = await fetch(
    `${FEISHU_BASE}/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await res.json();
  if (data.code !== 0) throw new Error(`feishu get record failed: ${data.code} ${data.msg}`);
  return data.data;
}

// ——— Amplify Data (DynamoDB) 备份 ———
// 飞书仍是主存储；写入飞书成功后把同一条数据备份到 Amplify Data 表。
// 尽力而为：备份失败只记日志，不影响对用户的成功响应。

/**
 * Best-effort dual-write into an Amplify Data table. `fields` are the schema
 * columns (camelCase); id / __typename / 时间戳 / submittedAt 在这里补。
 */
async function backupPut(tableName, typename, fields) {
  if (!tableName) return;
  const now = new Date().toISOString();
  const record = { __typename: typename, id: randomUUID(), createdAt: now, updatedAt: now, submittedAt: now, ...fields };
  const Item = {};
  for (const [k, v] of Object.entries(record)) {
    if (v !== undefined && v !== null && v !== '') Item[k] = { S: String(v) };
  }
  try {
    await ddb.send(new PutItemCommand({ TableName: tableName, Item }));
  } catch (err) {
    console.error(`backup to ${typename} (${tableName}) failed`, err);
  }
}

function asText(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(asText).join('').trim();
  if (typeof v === 'object') return asText(v.text ?? v.link ?? v.name ?? '');
  return '';
}

/** Submission row for the review UI — core columns plus optional extras shown when present. */
const EXTRA_COLUMNS = ['公司', '职位', '手机号', '社区身份', '赛道', '形式', '摘要', '简介', '难度等级', '照片', 'PPT'];

function mapRow(record) {
  const f = record?.fields ?? {};
  const row = {
    recordId: record?.record_id ?? '',
    name: asText(f['姓名']),
    email: asText(f['邮箱']),
    talk: asText(f['议题']),
    status: asText(f['状态']) || '待审核',
    extra: {},
  };
  for (const col of EXTRA_COLUMNS) {
    const v = asText(f[col]);
    if (v) row.extra[col] = v;
  }
  return row;
}

const STATUSES = ['待审核', '通过', '已通知', '已确认', '拒绝'];
// 「通过」只是评审决定，不触发发信；发信在发信台审批。已通知/已确认由系统流转
const REVIEWABLE = new Set(['待审核', '通过', '候补', '拒绝']);

/** Feishu tables often accumulate blank rows — no name/email/talk means nothing to review. */
const isBlankRow = (record) => {
  const f = record?.fields ?? {};
  return !asText(f['姓名']) && !asText(f['邮箱']) && !asText(f['议题']);
};

// ——— 志愿者报名表 ———

/** 志愿者报名行（审核面板 / 指引页共用） */
function mapVolunteerRow(record) {
  const f = record?.fields ?? {};
  return {
    recordId: record?.record_id ?? '',
    name: asText(f['姓名']),
    email: asText(f['邮箱']),
    phone: asText(f['手机号']),
    role: asText(f['意向岗位']),
    note: asText(f['备注']),
    status: asText(f['状态']) || '待审核',
  };
}

/** 志愿者表没有议题列：姓名和邮箱都空即为空行 */
const isBlankVolunteerRow = (record) => {
  const f = record?.fields ?? {};
  return !asText(f['姓名']) && !asText(f['邮箱']);
};

/** 评审三态可手动流转；已通知/已确认由 volunteer-accept-mailer 自动写入 */
const VOLUNTEER_REVIEWABLE = new Set(['待审核', '通过', '拒绝']);

// ——— routes ———

async function handleCallback(body) {
  const { code, state } = body ?? {};
  if (!checkState(state, SESSION_SECRET)) return json(400, { error: 'state 无效或已过期，请重新登录' });
  if (!code) return json(400, { error: '缺少 code' });
  const user = await fetchUser(await exchangeCode(code));
  if (!isAllowed(user, ALLOWED_OPEN_IDS, ALLOWED_EMAILS)) {
    // surface the open_id so the operator can add it to ALLOWED_OPEN_IDS
    return json(403, { error: '没有管理权限', openId: user.openId, name: user.name });
  }
  return json(200, { token: makeSession(user, SESSION_SECRET), name: user.name, picture: user.picture });
}

/** Count rows, tolerating an unconfigured (empty) table id and skipping blank rows. */
async function countRecords(tableId, appToken, ...nameFields) {
  if (!tableId) return 0;
  const rows = await listRecords(tableId, appToken);
  if (!nameFields.length) return rows.length;
  return rows.filter((r) => nameFields.some((n) => asText(r?.fields?.[n]))).length;
}

async function handleOverview() {
  const [subs, speakers, partners] = await Promise.all([
    listRecords(FEISHU_CFP_TABLE_ID),
    countRecords(FEISHU_SPEAKERS_TABLE_ID, DISPLAY_APP_TOKEN, '姓名'),
    countRecords(FEISHU_SPONSORS_TABLE_ID, DISPLAY_APP_TOKEN, '名称', '公司'),
  ]);
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const r of subs) {
    if (isBlankRow(r)) continue;
    byStatus[mapRow(r).status] = (byStatus[mapRow(r).status] ?? 0) + 1;
  }
  return json(200, { submissions: byStatus, speakers, partners });
}

async function handleSetStatus(body) {
  const { recordId, status } = body ?? {};
  if (!recordId || !REVIEWABLE.has(status)) {
    return json(400, { error: `status 只能是 ${[...REVIEWABLE].join(' / ')}（已通知/已确认由系统自动流转）` });
  }
  await updateRecord(FEISHU_CFP_TABLE_ID, recordId, { 状态: status });
  return json(200, { ok: true });
}

/** POST /api/volunteers/status — 与 handleSetStatus 同款校验，目标换成志愿者报名表。 */
async function handleVolunteerSetStatus(body) {
  const { recordId, status } = body ?? {};
  if (!recordId || !VOLUNTEER_REVIEWABLE.has(status)) {
    return json(400, { error: `status 只能是 ${[...VOLUNTEER_REVIEWABLE].join(' / ')}（已通知/已确认由系统自动流转）` });
  }
  await updateRecord(FEISHU_VOLUNTEERS_TABLE_ID, recordId, { 状态: status });
  return json(200, { ok: true });
}

/**
 * Public CFP submission (no session). Honeypot: bots filling the hidden
 * `website` field get a fake success and nothing is written.
 */
/** CFP 已于 2026.08.31 截止：拒绝新投稿（前端 app/src/lib/site.ts cfpOpen 同步关闭）。重新开放时改回 false。 */
const CFP_CLOSED = true;

async function handleCfpSubmit(body) {
  if (CFP_CLOSED) return json(403, { error: '议题征集已于 2026.08.31 截止，感谢关注。如有疑问请邮件联系组委会。' });
  if (body?.website) return json(200, { ok: true });
  const v = validateSubmission(body);
  if (!v.ok) return json(400, { error: v.error });
  // 同一邮箱最多投 2 个议题（CFP FAQ 的承诺，服务端强制）
  const existing = countSubmissionsByEmail(await listRecords(FEISHU_CFP_TABLE_ID), v.data.email);
  if (existing >= MAX_SUBMISSIONS_PER_EMAIL) {
    return json(400, { error: `每个邮箱最多投 ${MAX_SUBMISSIONS_PER_EMAIL} 个议题，你已达到上限。如需修改已投议题，请邮件联系组委会。` });
  }
  const recordId = await createRecord(FEISHU_CFP_TABLE_ID, {
    姓名: v.data.name,
    邮箱: v.data.email,
    手机号: v.data.phone,
    社区身份: v.data.communityTitle,
    议题: v.data.talk,
    赛道: v.data.track,
    形式: v.data.format,
    摘要: v.data.abstract,
    简介: v.data.bio,
    状态: '待审核',
  });
  await backupPut(CFP_TABLE_NAME, 'CFPSubmission', {
    name: v.data.name,
    email: v.data.email,
    phone: v.data.phone,
    communityTitle: v.data.communityTitle,
    title: v.data.talk,
    track: v.data.track,
    format: v.data.format,
    abstract: v.data.abstract,
    bio: v.data.bio,
    status: '待审核',
    feishuRecordId: recordId,
  });
  // Hero 投稿实时通知组委会：尽力而为，失败只记日志，不影响投稿成功响应
  if (isHeroTitle(body?.communityTitle)) {
    try {
      await notifyHero(v.data);
    } catch (err) {
      console.error(`hero notify failed for ${recordId}`, err);
    }
  }
  return json(200, { ok: true });
}

/** Shared send-email HTTP API (EMAIL_LINK + x-api-key EMAIL_KEY)，与 mailer 同一通道。Throws on failure. */
async function sendMail({ to, subject, text, html }) {
  if (!EMAIL_LINK) throw new Error('EMAIL_LINK is empty');
  const res = await fetch(EMAIL_LINK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(EMAIL_KEY ? { 'x-api-key': EMAIL_KEY } : {}) },
    body: JSON.stringify({ from: EMAIL_FROM, to, cc: '', bcc: '', subject, text_body: text, html_body: html, attachments: [] }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(`send-email api failed: HTTP ${res.status} ${JSON.stringify(data)}`);
}

/** Hero 身份投稿 → 实时邮件通知 HERO_NOTIFY_TO（非生产可用 TEST_TO 重定向）。 */
async function notifyHero(d) {
  if (!HERO_NOTIFY_TO) return;
  const rows = [
    ['姓名', d.name],
    ['邮箱', d.email],
    ['手机号', d.phone || '—'],
    ['社区身份', d.communityTitle],
    ['议题', d.talk],
    ['赛道', d.track],
    ['形式', d.format],
  ];
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const text = ['Community Hero 投稿通知', '', ...rows.map(([k, val]) => `${k}：${val}`), '', `摘要：${d.abstract}`].join('\n');
  const html = `<h2 style="font-family:sans-serif;">Community Hero 投稿通知</h2><table style="font-family:sans-serif;border-collapse:collapse;">${rows
    .map(([k, val]) => `<tr><td style="padding:4px 12px 4px 0;color:#666;">${k}</td><td style="padding:4px 0;">${esc(val)}</td></tr>`)
    .join('')}</table><p style="font-family:sans-serif;"><b>摘要</b><br>${esc(d.abstract)}</p>`;
  const subject = `[Hero 投稿] ${d.name}：${d.talk}`;
  await sendMail({
    to: TEST_TO || HERO_NOTIFY_TO,
    subject: TEST_TO ? `[TEST→${HERO_NOTIFY_TO}] ${subject}` : subject,
    text,
    html,
  });
}

/** Public venue-notify subscription (no session) → 订阅表. Honeypot + dedupe by email. */
async function handleSubscribe(body) {
  if (body?.website) return json(200, { ok: true });
  const email = String(body?.email ?? '').trim().slice(0, 100);
  if (!EMAIL_RE.test(email)) return json(400, { error: '邮箱格式不正确' });
  if (!FEISHU_SUBSCRIBE_TABLE_ID) return json(500, { error: 'FEISHU_SUBSCRIBE_TABLE_ID 未配置' });
  const rows = await listRecords(FEISHU_SUBSCRIBE_TABLE_ID);
  const exists = rows.some((r) => asText(r?.fields?.['邮箱']).toLowerCase() === email.toLowerCase());
  if (!exists) {
    await createRecord(FEISHU_SUBSCRIBE_TABLE_ID, {
      邮箱: email,
      订阅时间: new Date().toISOString(),
      来源: String(body?.source ?? '过桥须知').slice(0, 30),
    });
  }
  return json(200, { ok: true });
}

/** Public volunteer application (no session) → 志愿者报名表. Same honeypot trick as CFP. */
async function handleVolunteerSubmit(body) {  if (body?.website) return json(200, { ok: true });
  if (!FEISHU_VOLUNTEERS_TABLE_ID) return json(500, { error: 'FEISHU_VOLUNTEERS_TABLE_ID 未配置' });
  const v = validateVolunteer(body);
  if (!v.ok) return json(400, { error: v.error });
  // 邮箱去重：同邮箱已有记录则幂等返回，不重复建行（志愿者量小，list 后 find 即可）
  const dup = (await listRecords(FEISHU_VOLUNTEERS_TABLE_ID)).some(
    (r) => asText(r?.fields?.['邮箱']).toLowerCase() === v.data.email.toLowerCase(),
  );
  if (dup) return json(200, { ok: true });
  const recordId = await createRecord(FEISHU_VOLUNTEERS_TABLE_ID, {
    姓名: v.data.name,
    邮箱: v.data.email,
    手机号: v.data.phone,
    意向岗位: v.data.role,
    备注: v.data.note,
    状态: '待审核',
  });
  await backupPut(VOLUNTEER_TABLE_NAME, 'VolunteerSubmission', {
    name: v.data.name,
    email: v.data.email,
    phone: v.data.phone,
    role: v.data.role,
    note: v.data.note,
    status: '待审核',
    feishuRecordId: recordId,
  });
  return json(200, { ok: true });
}

/** GET /volunteer/me?token=…（公共）— 邮件 token 即指引页凭证，验签后返回本人信息。 */
async function handleVolunteerMe(token) {
  const recordId = verifyToken(token, CONFIRM_SECRET);
  if (!recordId) return json(401, { error: '链接无效或已过期，请从录取邮件重新进入' });
  try {
    const v = mapVolunteerRow((await getRecord(FEISHU_VOLUNTEERS_TABLE_ID, recordId)).record);
    // 组委会撤销（状态=已撤销）后 token 同步失效，指引页不再放行
    if (v.status === '已撤销') return json(401, { error: '链接无效或已过期，请从录取邮件重新进入' });
    return json(200, { name: v.name, role: v.role, status: v.status });
  } catch (err) {
    console.error(`volunteer record ${recordId} lookup failed`, err);
    return json(404, { error: '没有找到这条报名记录，请联系组委会' });
  }
}

/** Public sponsor application (no session) → 赞助商报名表. Same honeypot trick as CFP.
 *  Accepts JSON, or multipart/form-data when an optional logo file is attached. */
/** 赞助招募已关闭（前端 /sponsors 同步下线并重定向首页）。重新开放时改回 false 并恢复 App.tsx 路由。 */
const SPONSOR_CLOSED = true;

async function handleSponsorSubmit(event) {
  if (SPONSOR_CLOSED) return json(403, { error: '本届赞助招募已结束，感谢关注。如有合作意向请邮件联系组委会。' });
  const contentType = event.headers?.['content-type'] ?? event.headers?.['Content-Type'] ?? '';
  let body;
  let logoFile = null;
  if (contentType.includes('multipart/form-data')) {
    const raw = event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64') : Buffer.from(event.body ?? '', 'utf8');
    const parsed = parseMultipart(raw, contentType);
    if (!parsed) return json(400, { error: '表单解析失败，请重试' });
    body = parsed.fields;
    if (parsed.files.logo?.data?.length) {
      // Public form: no SVG (XSS surface on CDN). Authenticated CRM upload may allow SVG.
      const v = validateImage(parsed.files.logo, { allowSvg: false });
      if (!v.ok) return json(400, { error: v.error });
      logoFile = v.data;
    }
  } else {
    body = JSON.parse(event.body ?? '{}');
  }
  if (body?.website) return json(200, { ok: true });
  if (!FEISHU_SPONSOR_APPS_TABLE_ID) return json(500, { error: 'FEISHU_SPONSOR_APPS_TABLE_ID 未配置' });
  const v = validateSponsor(body);
  if (!v.ok) return json(400, { error: v.error });
  const recordId = await createRecord(FEISHU_SPONSOR_APPS_TABLE_ID, {
    公司: v.data.company,
    联系人: v.data.contact,
    邮箱: v.data.email,
    手机号: v.data.phone,
    意向档位: v.data.tier,
    备注: v.data.note,
    状态: '待审核',
  });
  let logoUrl = '';
  if (logoFile && recordId) {
    const { url } = await uploadAsset(`sponsors/${recordId}/logo${logoFile.ext}`, logoFile);
    await updateRecord(FEISHU_SPONSOR_APPS_TABLE_ID, recordId, { Logo: url });
    logoUrl = url;
  }
  await backupPut(SPONSOR_TABLE_NAME, 'SponsorSubmission', {
    companyName: v.data.company,
    contactName: v.data.contact,
    email: v.data.email,
    phone: v.data.phone,
    tier: v.data.tier,
    note: v.data.note,
    logoUrl,
    status: '待审核',
    feishuRecordId: recordId,
  });
  return json(200, { ok: true });
}

// ——— CRM (讲师 / 赞助商) + CMS 图片上传 ———

/** CRM row mappers for the two display tables. */
function mapSpeakerRow(record) {
  const f = record?.fields ?? {};
  return {
    recordId: record?.record_id ?? '',
    id: asText(f['ID']),
    name: asText(f['姓名']),
    nameEn: asText(f['英文名']),
    company: asText(f['公司']),
    role: asText(f['职位']),
    track: asText(f['赛道']),
    time: asText(f['时间']),
    talk: asText(f['议题']),
    bio: asText(f['简介']),
    featured: f['主推'] === true,
    show: f['展示'] === true,
    photo: asText(f['照片']),
  };
}

function mapSponsorRow(record) {
  const f = record?.fields ?? {};
  return {
    recordId: record?.record_id ?? '',
    id: asText(f['ID']),
    name: asText(f['名称']) || asText(f['公司']),
    url: asText(f['官网']),
    tier: asText(f['意向档位']),
    status: asText(f['状态']) || '待审核',
    logo: asText(f['Logo']),
    show: f['展示'] === true,
  };
}

/** Editable fields per CRM table — text inputs and checkbox toggles. */
const CRM_TABLES = {
  speakers: {
    tableId: () => FEISHU_SPEAKERS_TABLE_ID,
    appToken: () => DISPLAY_APP_TOKEN,
    text: ['ID', '姓名', '英文名', '缩写', '公司', '职位', '议题', '简介', '时间'],
    /** 赛道为受控枚举，与 content-sync TRACK_IDS 对齐 */
    track: ['keynote', 'ai', 'builder', 'spark', 'global'],
    bool: ['主推', '展示'],
  },
  sponsors: {
    tableId: () => FEISHU_SPONSORS_TABLE_ID,
    appToken: () => DISPLAY_APP_TOKEN,
    text: ['ID', '名称'],
    url: ['官网'],
    bool: ['展示'],
    /** 评审三态可手动流转；已通知/已确认由 sponsor-logo-mailer 自动写入 */
    status: ['待审核', '通过', '拒绝'],
  },
};

async function handleCrmList(table) {
  const cfg = CRM_TABLES[table];
  if (!cfg) return json(404, { error: 'not found' });
  const tableId = cfg.tableId();
  if (!tableId) return json(500, { error: `${table} 表未配置` });
  const rows = (await listRecords(tableId, DISPLAY_APP_TOKEN))
    .map(table === 'speakers' ? mapSpeakerRow : mapSponsorRow)
    .filter((r) => r.recordId && (r.name || r.id));
  return json(200, { rows });
}

async function handleCrmUpdate(body) {
  const { table, recordId, fields } = body ?? {};
  const cfg = CRM_TABLES[table];
  if (!cfg || !recordId || typeof fields !== 'object' || !fields) return json(400, { error: '参数不完整' });
  const update = {};
  for (const k of cfg.text) {
    if (k in fields) update[k] = String(fields[k] ?? '').slice(0, 500);
  }
  for (const k of cfg.bool) {
    if (k in fields) update[k] = fields[k] === true;
  }
  if (cfg.track && '赛道' in fields) {
    const track = String(fields['赛道'] ?? '').trim();
    if (!cfg.track.includes(track)) return json(400, { error: `赛道只能是 ${cfg.track.join(' / ')}` });
    update['赛道'] = track;
  }
  if (cfg.url) {
    for (const k of cfg.url) {
      if (!(k in fields)) continue;
      const cleaned = sanitizeHttpUrl(fields[k]);
      if (cleaned === null) return json(400, { error: `${k} 必须是 http(s) 链接` });
      update[k] = cleaned;
    }
  }
  if (cfg.status && '状态' in fields) {
    if (!cfg.status.includes(fields['状态'])) return json(400, { error: `状态只能是 ${cfg.status.join(' / ')}（已通知/已确认由系统自动流转）` });
    update['状态'] = fields['状态'];
  }
  if (Object.keys(update).length === 0) return json(400, { error: '没有可更新的字段' });
  await updateRecord(cfg.tableId(), recordId, update, cfg.appToken());
  return json(200, { ok: true });
}

/** Upload an image to the shared assets bucket; returns { key, url (CDN) }. */
async function uploadAsset(key, file) {
  await s3.send(new PutObjectCommand({ Bucket: ASSETS_BUCKET, Key: key, Body: file.data, ContentType: file.contentType }));
  return { key, url: ASSETS_CDN_DOMAIN ? `https://${ASSETS_CDN_DOMAIN}/${key}` : key };
}

/** POST /api/upload (multipart) — CMS: speaker photo / sponsor logo straight onto the site. */
async function handleUpload(event) {
  const contentType = event.headers?.['content-type'] ?? event.headers?.['Content-Type'] ?? '';
  const raw = event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64') : Buffer.from(event.body ?? '', 'utf8');
  const parsed = parseMultipart(raw, contentType);
  if (!parsed) return json(400, { error: '表单解析失败，请重试' });
  const { kind, recordId } = parsed.fields;
  if (!ASSETS_BUCKET) return json(500, { error: 'ASSETS_BUCKET 未配置' });
  const v = validateImage(parsed.files.file, { allowSvg: kind === 'sponsor' });
  if (!v.ok) return json(400, { error: v.error });
  if (kind === 'speaker') {
    const { url } = await uploadAsset(`speakers/${recordId}/photo${v.data.ext}`, v.data);
    await updateRecord(FEISHU_SPEAKERS_TABLE_ID, recordId, { 照片: url }, DISPLAY_APP_TOKEN);
    return json(200, { ok: true, url });
  }
  if (kind === 'sponsor') {
    const { url } = await uploadAsset(`sponsors/${recordId}/logo${v.data.ext}`, v.data);
    await updateRecord(FEISHU_SPONSORS_TABLE_ID, recordId, { Logo: url }, DISPLAY_APP_TOKEN);
    return json(200, { ok: true, url });
  }
  return json(400, { error: 'kind 只能是 speaker / sponsor' });
}

async function invoke(functionName, payload) {
  const res = await lambda.send(
    new InvokeCommand({
      FunctionName: functionName,
      InvocationType: 'RequestResponse',
      ...(payload ? { Payload: JSON.stringify(payload) } : {}),
    }),
  );
  const data = JSON.parse(Buffer.from(res.Payload ?? []).toString() || '{}');
  return { error: res.FunctionError ? data : null, data };
}

async function handleSync() {
  if (!CONTENT_SYNC_FUNCTION) return json(500, { error: 'CONTENT_SYNC_FUNCTION 未配置' });
  const { error, data } = await invoke(CONTENT_SYNC_FUNCTION);
  return json(error ? 502 : 200, error ?? data);
}

/** POST /api/notify — invoke the accept mailer with {"force": true}: send the batch now, skipping NOTIFY_AT. */
/**
 * 发信台代理（cdkit）。2026 秋的 /api/notify 直接强制触发 mailer，飞书里标「通过」的人全部被发信；
 * 现在拆成两步：plan 返回名单 + 名额表（不发信），send 需要 digest + 人工输入的人数 + 审批人。
 */
const OUTBOX_TEMPLATES = ['cfp-accept', 'cfp-waitlist', 'cfp-decline', 'volunteer-accept', 'sponsor-accept'];

async function handleOutbox(action, body, user) {
  if (!OUTBOX_FUNCTION) return json(500, { error: 'OUTBOX_FUNCTION 未配置' });
  let payload;
  if (action === 'plan') {
    if (!OUTBOX_TEMPLATES.includes(body?.template)) return json(400, { error: '未知模板' });
    payload = { action, template: body.template };
  } else if (action === 'send') {
    payload = {
      action,
      batchId: String(body?.batchId ?? ''),
      digest: String(body?.digest ?? ''),
      confirmCount: Number(body?.confirmCount),
      overrideReason: body?.overrideReason ? String(body.overrideReason).slice(0, 500) : undefined,
      // 审批人取自登录会话，不信任前端传值
      approvedBy: `${user.name ?? ''}(${user.sub})`,
    };
  } else if (action === 'release') {
    payload = { action, template: String(body?.template ?? ''), recordId: String(body?.recordId ?? '') };
  } else {
    return json(404, { error: 'not found' });
  }
  const { error, data } = await invoke(OUTBOX_FUNCTION, payload);
  if (error) return json(502, error);
  return json(data?.ok ? 200 : 400, data);
}

function auth(event) {
  const header = event.headers?.authorization ?? event.headers?.Authorization ?? '';
  return checkSession(header.replace(/^Bearer\s+/i, ''), SESSION_SECRET);
}

export async function handler(event) {
  const path = event?.requestContext?.http?.path ?? '/';
  const method = event?.requestContext?.http?.method ?? 'GET';
  try {
    if (path === '/auth/url' && method === 'GET') return json(200, { url: authorizeUrl() });
    if (path === '/auth/callback' && method === 'POST') {
      const parsed = parseJsonBody(event);
      if (!parsed.ok) return json(400, { error: 'invalid json' });
      return await handleCallback(parsed.data);
    }
    // public endpoints — no session, validated + honeypot + best-effort rate limit
    if (path === '/cfp/submit' && method === 'POST') {
      const limited = checkPublicRate(event, 'cfp');
      if (limited) return limited;
      const parsed = parseJsonBody(event);
      if (!parsed.ok) return json(400, { error: 'invalid json' });
      return await handleCfpSubmit(parsed.data);
    }
    if (path === '/volunteer/submit' && method === 'POST') {
      const limited = checkPublicRate(event, 'volunteer');
      if (limited) return limited;
      const parsed = parseJsonBody(event);
      if (!parsed.ok) return json(400, { error: 'invalid json' });
      return await handleVolunteerSubmit(parsed.data);
    }
    if (path === '/volunteer/me' && method === 'GET') {
      const limited = checkPublicRate(event, 'volunteer-me');
      if (limited) return limited;
      return await handleVolunteerMe(event.queryStringParameters?.token);
    }
    if (path === '/sponsor/submit' && method === 'POST') {
      const limited = checkPublicRate(event, 'sponsor');
      if (limited) return limited;
      return await handleSponsorSubmit(event);
    }
    if (path === '/subscribe' && method === 'POST') {
      const limited = checkPublicRate(event, 'subscribe');
      if (limited) return limited;
      return await handleSubscribe(JSON.parse(event.body ?? '{}'));
    }
    if (path.startsWith('/api/')) {
      const user = auth(event);
      if (!user) return json(401, { error: '未登录或会话已过期' });
      let body;
      if (method === 'POST' && !path.startsWith('/api/upload')) {
        const parsed = parseJsonBody(event);
        if (!parsed.ok) return json(400, { error: 'invalid json' });
        body = parsed.data;
      }
      if (path === '/api/overview' && method === 'GET') return await handleOverview();
      if (path === '/api/submissions' && method === 'GET') {
        return json(200, { submissions: (await listRecords(FEISHU_CFP_TABLE_ID)).filter((r) => !isBlankRow(r)).map(mapRow) });
      }
      if (path === '/api/submissions/status' && method === 'POST') return await handleSetStatus(body);
      if (path === '/api/sync' && method === 'POST') return await handleSync();
      if (path.startsWith('/api/outbox/') && method === 'POST') return await handleOutbox(path.slice('/api/outbox/'.length), body, user);
      // 旧的「立即通知」入口：已废弃（会绕过名额校验与二次确认）
      if ((path === '/api/notify' || path === '/api/volunteers/notify') && method === 'POST') {
        return json(410, { error: '已改为「发信台」：先生成批次核对名单与名额，再确认发送（/api/outbox/plan → /api/outbox/send）' });
      }
      if (path === '/api/volunteers' && method === 'GET') {
        return json(200, { rows: (await listRecords(FEISHU_VOLUNTEERS_TABLE_ID)).filter((r) => !isBlankVolunteerRow(r)).map(mapVolunteerRow) });
      }
      if (path === '/api/volunteers/status' && method === 'POST') return await handleVolunteerSetStatus(body);
      if (path === '/api/crm/speakers' && method === 'GET') return await handleCrmList('speakers');
      if (path === '/api/crm/sponsors' && method === 'GET') return await handleCrmList('sponsors');
      if (path === '/api/crm/update' && method === 'POST') return await handleCrmUpdate(body);
      if (path === '/api/upload' && method === 'POST') return await handleUpload(event);
    }
    return json(404, { error: 'not found' });
  } catch (err) {
    console.error(`${method} ${path} failed`, err);
    return json(500, { error: 'internal error' });
  }
}
