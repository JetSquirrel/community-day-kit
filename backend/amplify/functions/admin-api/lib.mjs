/**
 * Pure auth logic for the admin API — no I/O, unit-testable (lib.test.mjs).
 * Stateless HMAC tokens, same pattern as cfp-accept-mailer: no database.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const hmac = (value, secret) => createHmac('sha256', secret).update(value).digest('base64url');

const safeEqual = (a, b) => {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
};

// ——— OAuth state (CSRF protection on the callback, 10 min validity) ———

export const STATE_MAX_AGE_MS = 10 * 60 * 1000;

export function makeState(secret, now = Date.now()) {
  const ts = String(Math.floor(now / 1000));
  return `${ts}.${hmac(`state.${ts}`, secret)}`;
}

export function checkState(state, secret, now = Date.now()) {
  const [ts, sig] = String(state ?? '').split('.');
  if (!ts || !sig || !safeEqual(sig, hmac(`state.${ts}`, secret))) return false;
  return now - Number(ts) * 1000 <= STATE_MAX_AGE_MS;
}

// ——— admin session (7 days, carries the Feishu identity) ———

export const SESSION_TTL_MS = 7 * 24 * 3600 * 1000;

export function makeSession(user, secret, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({ sub: user.openId, name: user.name, picture: user.picture ?? '', exp: now + SESSION_TTL_MS }),
  ).toString('base64url');
  return `${payload}.${hmac(payload, secret)}`;
}

/** @returns session payload when valid & unexpired, else null */
export function checkSession(token, secret, now = Date.now()) {
  const [payload, sig] = String(token ?? '').split('.');
  if (!payload || !sig || !safeEqual(sig, hmac(payload, secret))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.sub && typeof data.exp === 'number' && data.exp > now ? data : null;
  } catch {
    return null;
  }
}

// ——— allowlist ———

const csv = (s) =>
  String(s ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

/** open_id is the primary key; email accepted as a convenience when Feishu returns it. */
export function isAllowed({ openId, email }, allowedOpenIds, allowedEmails) {
  const ids = csv(allowedOpenIds);
  const mails = csv(allowedEmails).map((m) => m.toLowerCase());
  if (ids.length === 0 && mails.length === 0) return false; // fail closed
  return (openId && ids.includes(openId)) || (email && mails.includes(email.toLowerCase())) || false;
}

// ——— public CFP submission validation (POST /cfp/submit) ———

const TRACK_IDS = new Set(['ai', 'builder', 'spark', 'global']);
export const FORMAT_OPTIONS = ['深度分享（35min）', '闪电演讲（10min）', 'Workshop（60–90min）'];
/** 社区身份 chips — must stay in sync with ApplyForm COMMUNITY_TITLES */
export const COMMUNITY_TITLES = {
  community_hero: 'Community Hero',
  community_builder: 'Community Builder',
  user_group_leader: 'User Group Leader',
  user_group_ambassador: 'User Group Ambassador',
};
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s-]{4,29}$/;

/** Bitable value shapes → plain text (same shapes as feishu-content-sync). */
export function asText(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(asText).join('').trim();
  if (typeof v === 'object') return asText(v.text ?? v.link ?? v.name ?? '');
  return '';
}

/** 同一邮箱的投稿数上限（CFP FAQ 承诺「每人最多 2 个」） */
export const MAX_SUBMISSIONS_PER_EMAIL = 2;

/** Count non-blank submissions with this email (case-insensitive). */
export function countSubmissionsByEmail(records, email) {
  const target = String(email ?? '').trim().toLowerCase();
  if (!target) return 0;
  return records.filter((r) => {
    const f = r?.fields ?? {};
    const hasContent = asText(f['姓名']) || asText(f['议题']);
    return hasContent && asText(f['邮箱']).toLowerCase() === target;
  }).length;
}

const cut = (s, n) =>
  String(s ?? '')
    .trim()
    .slice(0, n);

/** Normalize the community-title array into a readable label string ('' when none/invalid). */
export function communityTitles(input) {
  if (!Array.isArray(input)) return '';
  const labels = input.map((v) => COMMUNITY_TITLES[String(v)]).filter(Boolean);
  return [...new Set(labels)].join(', ');
}

/** Hero 投稿判定 — communityTitle 原始数组里含 community_hero（用于投稿实时通知） */
export function isHeroTitle(input) {
  return Array.isArray(input) && input.some((v) => String(v) === 'community_hero');
}

/** 志愿者意向岗位 — must stay in sync with VolunteerForm ROLE_OPTIONS */
export const VOLUNTEER_ROLES = ['签到引导组', '会场执行组', '直播技术组', '摄影记录组', '嘉宾接待组', '物料后勤组'];

/** 赞助商意向档位 — must stay in sync with SponsorForm TIER_OPTIONS */
export const SPONSOR_TIERS = ['钻石赞助', '铂金赞助', '金牌赞助', '银牌赞助', '社区合作伙伴', '宣传合作'];

/** Validate + normalize a submission. @returns { ok: true, data } | { ok: false, error } */
export function validateSubmission(body) {
  const data = {
    name: cut(body?.name, 30),
    email: cut(body?.email, 100),
    phone: cut(body?.phone, 30),
    talk: cut(body?.talk, 60),
    track: cut(body?.track, 20),
    format: cut(body?.format, 40),
    abstract: cut(body?.abstract, 1000),
    bio: cut(body?.bio, 500),
    communityTitle: communityTitles(body?.communityTitle),
  };
  if (!data.name) return { ok: false, error: '请填写称呼' };
  if (!EMAIL_RE.test(data.email)) return { ok: false, error: '邮箱格式不正确' };
  if (data.phone && !PHONE_RE.test(data.phone)) return { ok: false, error: '手机号格式不正确' };
  if (!data.talk) return { ok: false, error: '请填写议题标题' };
  if (!TRACK_IDS.has(data.track)) return { ok: false, error: '请选择赛道' };
  if (!FORMAT_OPTIONS.includes(data.format)) return { ok: false, error: '请选择演讲形式' };
  if (data.abstract.length < 50) return { ok: false, error: '摘要至少 50 字，帮助评审看懂你的议题' };
  return { ok: true, data };
}

/** Validate + normalize a volunteer application (POST /volunteer/submit). */
export function validateVolunteer(body) {
  const data = {
    name: cut(body?.name, 30),
    email: cut(body?.email, 100),
    phone: cut(body?.phone, 30),
    role: cut(body?.role, 20),
    note: cut(body?.note, 500),
  };
  if (!data.name) return { ok: false, error: '请填写称呼' };
  if (!EMAIL_RE.test(data.email)) return { ok: false, error: '邮箱格式不正确' };
  if (data.phone && !PHONE_RE.test(data.phone)) return { ok: false, error: '手机号格式不正确' };
  if (!VOLUNTEER_ROLES.includes(data.role)) return { ok: false, error: '请选择意向岗位' };
  return { ok: true, data };
}

/** Validate + normalize a sponsor application (POST /sponsor/submit). */
export function validateSponsor(body) {
  const data = {
    company: cut(body?.company, 60),
    contact: cut(body?.contact, 30),
    email: cut(body?.email, 100),
    phone: cut(body?.phone, 30),
    tier: cut(body?.tier, 20),
    note: cut(body?.note, 500),
  };
  if (!data.company) return { ok: false, error: '请填写公司名称' };
  if (!data.contact) return { ok: false, error: '请填写联系人' };
  if (!EMAIL_RE.test(data.email)) return { ok: false, error: '邮箱格式不正确' };
  if (data.phone && !PHONE_RE.test(data.phone)) return { ok: false, error: '手机号格式不正确' };
  if (!SPONSOR_TIERS.includes(data.tier)) return { ok: false, error: '请选择意向档位' };
  return { ok: true, data };
}

// ——— multipart parsing + image upload validation (CRM/CMS uploads) ———

/**
 * Minimal multipart/form-data parser (zero deps) — same as the mailers'.
 * @returns { fields, files } | null when the boundary is missing
 */
export function parseMultipart(body, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType ?? '');
  if (!m) return null;
  const delim = Buffer.from(`--${(m[1] ?? m[2]).trim()}`);
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'binary');
  const fields = {};
  const files = {};
  let pos = buf.indexOf(delim);
  if (pos === -1) return null;
  pos += delim.length;
  for (;;) {
    if (buf[pos] === 0x2d && buf[pos + 1] === 0x2d) break; // closing delimiter
    if (buf[pos] === 0x0d && buf[pos + 1] === 0x0a) pos += 2;
    const next = buf.indexOf(delim, pos);
    if (next === -1) break;
    const part = buf.subarray(pos, Math.max(pos, next - 2)); // strip trailing CRLF
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd !== -1) {
      const header = part.subarray(0, headerEnd).toString('utf8');
      const content = part.subarray(headerEnd + 4);
      const name = /name="([^"]+)"/.exec(header)?.[1];
      const filename = /filename="([^"]*)"/.exec(header)?.[1];
      const ctype = /content-type:\s*([^\r;]+)/i.exec(header)?.[1]?.trim();
      if (name) {
        if (filename) files[name] = { filename, contentType: ctype ?? 'application/octet-stream', data: content };
        else fields[name] = content.toString('utf8').trim();
      }
    }
    pos = next + delim.length;
  }
  return { fields, files };
}

const PHOTO_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const LOGO_TYPES = { ...PHOTO_TYPES, 'image/svg+xml': '.svg' };
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/**
 * Validate an uploaded image file. @param allowSvg logos may be SVG, photos may not.
 * @returns { ok: true, data: { ...file, ext } } | { ok: false, error }
 */
export function validateImage(file, { allowSvg = false } = {}) {
  if (!file?.data?.length) return { ok: false, error: '请选择要上传的图片文件' };
  const types = allowSvg ? LOGO_TYPES : PHOTO_TYPES;
  const ext = types[file.contentType];
  if (!ext) return { ok: false, error: `图片格式仅支持 ${allowSvg ? 'JPG / PNG / WebP / SVG' : 'JPG / PNG / WebP'}` };
  if (file.data.length > MAX_IMAGE_BYTES) return { ok: false, error: '图片超过 4MB，请压缩后重试' };
  // Magic-byte / SVG sanity checks — do not trust the multipart Content-Type alone.
  if (ext === '.svg') {
    const text = file.data.toString('utf8').slice(0, 64 * 1024);
    if (!/<svg[\s/>]/i.test(text)) return { ok: false, error: 'SVG 内容无效' };
    if (/<script|on\w+\s*=|javascript:/i.test(text)) return { ok: false, error: 'SVG 含有不安全内容' };
  } else if (!looksLikeImage(file.data, ext)) {
    return { ok: false, error: '图片内容与格式不匹配，请重新导出后上传' };
  }
  return { ok: true, data: { ...file, ext, contentType: Object.entries(types).find(([, e]) => e === ext)?.[0] ?? file.contentType } };
}

function looksLikeImage(buf, ext) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return false;
  if (ext === '.jpg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (ext === '.png') return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (ext === '.webp') return buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  return false;
}

/** Allow only http(s) URLs for CRM「官网」and similar public hrefs. */
export function sanitizeHttpUrl(raw, { maxLen = 500 } = {}) {
  const s = String(raw ?? '').trim().slice(0, maxLen);
  if (!s) return '';
  try {
    const u = new URL(s);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return s;
  } catch {
    return null;
  }
}

/**
 * Best-effort per-container rate limit (warm Lambda instances).
 * @returns true when the request is allowed
 */
export function allowRate({ key, limit, windowMs, now = Date.now(), store }) {
  const bucket = store.get(key);
  if (!bucket || now - bucket.start >= windowMs) {
    store.set(key, { start: now, count: 1 });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
