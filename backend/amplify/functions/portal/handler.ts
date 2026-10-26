/**
 * 讲者 / 赞助商材料页（Function URL，链接令牌即凭证）。
 *
 * 解决 2026 秋的两个问题：
 *  ① 照片规格不一致导致海报生成器用不上 —— 页面先展示拍摄要求；浏览器内按 4:5 框选裁剪后再上传；
 *     服务端读文件头复核尺寸比例；AI 检查单人 / 清晰 / 背景 / 水印并返回人脸中心（海报按它裁）。
 *  ② PPT 全靠人工审 —— 页面先展示 PPT 规范；上传后程序检查（页数 / 字号 / 敏感词 / 模板）
 *     + AI 逐条预审，讲者提交前就拿到修改建议；组委会只复核标红项。
 * 另外：文件经 S3 预签名直传（旧版走 Function URL，PPT 超过 4MB 就得回邮件发）。
 *
 *   GET  /?k=speaker|sponsor&t=<token>   页面
 *   POST /presign  { kind, contentType, size, filename } → { url, key }
 *   POST /review   { kind, key } → 审核报告（同时存为 <key>.review.json）
 *   POST /submit   { level?, photoKey?, deckKey?, deckFinalKey?, logoKey? }
 *   POST /decline
 */
import { S3Client, GetObjectCommand, PutObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { t } from '@cdkit/core';
import { asText, type FeishuRecord } from '@cdkit/feishu';
import { readImageSize, checkPhoto, analyzePptx, analyzePdf, lintDeck, type Finding, type DeckFinding } from '@cdkit/media';
import { createAi, reviewPhoto, reviewDeck, AiUnavailable, type PhotoReview, type DeckReview } from '@cdkit/ai';
import { ev } from '../_shared/event.ts';
import { feishu, json, html, bodyJson, type UrlEvent } from '../_shared/io.ts';
import { verifyToken } from '../_shared/token.ts';
import { renderPage, renderError } from './page.ts';

const { ASSETS_BUCKET = '', ASSETS_CDN_DOMAIN = '', CONFIRM_SECRET = '' } = process.env;
const s3 = new S3Client({});
const ai = ev.ai.enabled ? createAi(ev) : null;
const APP = ev.feishu.appToken;

type Who = 'speaker' | 'sponsor';
type Kind = 'photo' | 'deck' | 'deckFinal' | 'logo';
const KINDS: Record<Who, Kind[]> = { speaker: ['photo', 'deck', 'deckFinal'], sponsor: ['logo'] };
const LOGO_EXT = ['svg', 'ai', 'eps', 'pdf', 'png'];
const LOGO_MAX = 30 * 1024 * 1024;

export interface Review {
  kind: Kind;
  key: string;
  ok: boolean;
  findings: (Finding | DeckFinding)[];
  ai: PhotoReview | DeckReview | null;
  aiNote?: string;
}

const f = (r: FeishuRecord, k: string) => asText(r.fields[k]);
const ext = (name: string) => (/\.([a-z0-9]+)$/i.exec(name)?.[1] ?? '').toLowerCase();

async function readObject(key: string): Promise<Buffer> {
  const o = await s3.send(new GetObjectCommand({ Bucket: ASSETS_BUCKET, Key: key }));
  return Buffer.from(await o.Body!.transformToByteArray());
}

function talkMinutes(r: FeishuRecord): number {
  const label = f(r, '形式');
  return ev.formats.find((x) => label.includes(x.label))?.minutes ?? ev.formats[0]?.minutes ?? 25;
}

// ——— review ———

async function reviewPhotoKey(key: string): Promise<Review> {
  const buf = await readObject(key);
  const size = readImageSize(buf);
  const findings = checkPhoto({ width: size?.width ?? 0, height: size?.height ?? 0, bytes: buf.length, type: size?.type ?? '' }, ev.materials.photo);
  if (findings.some((x) => x.level === 'error') || !ai) return { kind: 'photo', key, ok: !findings.some((x) => x.level === 'error'), findings, ai: null };
  try {
    const r = await reviewPhoto(ai, ev, { base64: buf.toString('base64'), mediaType: size!.type as 'image/jpeg' });
    return { kind: 'photo', key, ok: r.verdict !== 'reject', findings, ai: r };
  } catch (e) {
    if (!(e instanceof AiUnavailable)) console.error('photo ai', e);
    return { kind: 'photo', key, ok: true, findings, ai: null, aiNote: 'AI 审核暂不可用，已转组委会人工查看' };
  }
}

async function reviewDeckKey(kind: Kind, key: string, rec: FeishuRecord): Promise<Review> {
  const buf = await readObject(key);
  const e = ext(key);
  if (e === 'key') {
    return { kind, key, ok: true, findings: [{ level: 'warn', rule: '文件格式', message: 'Keynote 文件无法预审，请同时导出一份 PDF 或 PPTX 上传' }], ai: null };
  }
  const stats = e === 'pdf' ? analyzePdf(buf) : analyzePptx(buf);
  const ctx = { minutes: talkMinutes(rec), title: f(rec, '议题'), speaker: f(rec, '姓名') };
  const findings = lintDeck(stats, ev.materials.deck, ctx);
  const hard = findings.some((x) => x.level === 'error');
  if (hard || !ai) return { kind, key, ok: !hard, findings, ai: null };
  if (e === 'pdf' && buf.length > 25 * 1024 * 1024) {
    return { kind, key, ok: true, findings, ai: null, aiNote: 'PDF 超过 25MB，AI 预审跳过，已转人工' };
  }
  try {
    const r = await reviewDeck(ai, ev, {
      stats,
      findings,
      pdfBase64: e === 'pdf' ? buf.toString('base64') : undefined,
      talk: { title: ctx.title, abstract: f(rec, '摘要'), speaker: ctx.speaker, minutes: ctx.minutes, track: f(rec, '赛道') },
    });
    return { kind, key, ok: true, findings, ai: r };
  } catch (err) {
    if (!(err instanceof AiUnavailable)) console.error('deck ai', err);
    return { kind, key, ok: true, findings, ai: null, aiNote: 'AI 预审暂不可用，已转组委会人工审核' };
  }
}

async function reviewLogoKey(key: string): Promise<Review> {
  const buf = await readObject(key);
  const e = ext(key);
  const findings: Finding[] = [];
  if (e === 'svg') {
    const s = buf.toString('utf8', 0, Math.min(buf.length, 4096));
    if (!/<svg[\s>]/i.test(s)) findings.push({ level: 'error', code: 'svg', message: '不是有效的 SVG 文件' });
    if (/<image[\s>]/i.test(buf.toString('utf8'))) findings.push({ level: 'warn', code: 'svg-bitmap', message: 'SVG 内嵌了位图，放大印刷可能模糊，请提供纯矢量版本' });
  } else if (e === 'png') {
    const size = readImageSize(buf);
    if (!size) findings.push({ level: 'error', code: 'png', message: '无法读取 PNG 尺寸' });
    else if (size.width < 1000) findings.push({ level: 'error', code: 'low-res', message: `宽度 ${size.width}px 过小，至少 1000px（印刷建议 ≥2000px 或矢量）` });
    else if (size.width < 2000) findings.push({ level: 'warn', code: 'mid-res', message: `宽度 ${size.width}px，网页够用，印刷建议再提供矢量文件` });
  }
  return { kind: 'logo', key, ok: !findings.some((x) => x.level === 'error'), findings, ai: null };
}

// ——— routes ———

async function auth(e: UrlEvent): Promise<{ who: Who; table: string; rec: FeishuRecord } | null> {
  const q = e.queryStringParameters ?? {};
  const who = q.k === 'sponsor' ? 'sponsor' : 'speaker';
  const id = verifyToken(q.t, CONFIRM_SECRET, who);
  if (!id) return null;
  const table = who === 'speaker' ? ev.feishu.tables.cfp : ev.feishu.tables.sponsors;
  try {
    const rec = await feishu.getRecord(APP, table, id);
    if (['已撤销'].includes(f(rec, '状态'))) return null;
    return { who, table, rec };
  } catch {
    return null;
  }
}

async function loadReview(key: string): Promise<Review | null> {
  try {
    return JSON.parse((await readObject(`${key}.review.json`)).toString('utf8')) as Review;
  } catch {
    return null;
  }
}

function reviewSummary(r: Review | null): string {
  if (!r) return '';
  const ai = r.ai;
  const deck = ai && 'items' in ai ? ai : null;
  const photo = ai && 'checks' in ai ? ai : null;
  const verdict = ai?.verdict ?? (r.ok ? 'pass' : 'reject');
  const top = r.findings.filter((x) => x.level !== 'info').map((x) => `- ${'rule' in x ? x.rule : x.code}：${x.message}`);
  const aiItems = [
    ...(deck?.items ?? []).filter((i) => i.status !== 'pass').map((i) => `- [${i.status}] ${i.rule}${i.slides.length ? `（P${i.slides.join(',')}）` : ''}：${i.comment}`),
    ...(photo?.checks ?? []).filter((c) => !c.ok).map((c) => `- ${c.rule}：${c.note}`),
  ];
  return [`结论：${verdict}`, deck?.summary ?? photo?.message ?? r.aiNote ?? '', ...top, ...aiItems].filter(Boolean).join('\n');
}

async function submit(who: Who, table: string, rec: FeishuRecord, body: Record<string, string | undefined>) {
  const id = rec.record_id;
  const fields: Record<string, unknown> = {};
  const now = Date.now();
  const take = async (key: string | undefined, kind: Kind) => {
    if (!key) return null;
    if (!key.startsWith(`staging/${id}/${kind}-`)) throw new Error('文件不属于本链接');
    const r = await loadReview(key);
    if (!r?.ok) throw new Error(`${kind} 未通过基础检查，请按提示修改后重新上传`);
    return r;
  };
  const copy = async (from: string, to: string) => {
    await s3.send(new CopyObjectCommand({ Bucket: ASSETS_BUCKET, CopySource: `${ASSETS_BUCKET}/${encodeURIComponent(from).replace(/%2F/g, '/')}`, Key: to }));
    return ASSETS_CDN_DOMAIN && !to.startsWith('materials/') ? `https://${ASSETS_CDN_DOMAIN}/${to}` : to;
  };

  if (who === 'speaker') {
    const photo = await take(body.photoKey, 'photo');
    const deck = await take(body.deckKey, 'deck');
    const deckFinal = await take(body.deckFinalKey, 'deckFinal');
    const level = ['100', '200', '300', '400'].includes(body.level ?? '') ? body.level : undefined;
    const hasPhoto = !!f(rec, '照片') || !!photo;
    if (!hasPhoto) throw new Error('请先上传照片（海报必需）');
    if (level) fields['难度等级'] = level;
    if (photo) {
      fields['照片'] = await copy(photo.key, `speakers/${id}-${now}.jpg`);
      fields['照片审核'] = reviewSummary(photo);
    }
    if (deck) {
      fields['PPT 初稿'] = await copy(deck.key, `materials/${id}/draft-${now}.${ext(deck.key)}`);
      fields['PPT 审核'] = reviewSummary(deck);
    }
    if (deckFinal) {
      fields['PPT 终稿'] = await copy(deckFinal.key, `materials/${id}/final-${now}.${ext(deckFinal.key)}`);
      fields['PPT 审核'] = reviewSummary(deckFinal);
    }
    if (f(rec, '状态') === '已通知') fields['状态'] = '已确认';
    await feishu.updateRecord(APP, table, id, fields);
    await syncSpeaker(rec, fields, (photo?.ai as PhotoReview | null)?.faceCenter ?? null);
  } else {
    const logo = await take(body.logoKey, 'logo');
    if (!logo) throw new Error('请上传 Logo');
    fields['Logo'] = await copy(logo.key, `sponsors/${id}-${now}.${ext(logo.key)}`);
    if (['已通知', '通过'].includes(f(rec, '状态'))) fields['状态'] = '已确认';
    await feishu.updateRecord(APP, table, id, fields);
  }
  return { ok: true, updated: Object.keys(fields) };
}

/** 已确认讲者 → 嘉宾表 upsert（ID = 投稿 recordId）。展示 / 主推仍由组委会勾选。 */
async function syncSpeaker(rec: FeishuRecord, changed: Record<string, unknown>, face: { x: number; y: number } | null) {
  const table = ev.feishu.tables.speakers;
  if (!table) return;
  const fields: Record<string, unknown> = { 姓名: f(rec, '姓名'), 议题: f(rec, '议题'), 公司: f(rec, '公司'), 职位: f(rec, '职位'), 简介: f(rec, '简介') };
  if (f(rec, '赛道')) fields['赛道'] = f(rec, '赛道');
  if (changed['照片']) fields['照片'] = changed['照片'];
  if (face) fields['照片焦点'] = `${face.x.toFixed(3)},${face.y.toFixed(3)}`;
  const rows = await feishu.listRecords(APP, table);
  const existing = rows.find((r) => f(r, 'ID') === rec.record_id);
  if (existing) await feishu.updateRecord(APP, table, existing.record_id, fields);
  else await feishu.createRecord(APP, table, { ID: rec.record_id, 展示: false, 主推: false, ...fields });
}

export async function handler(e: UrlEvent) {
  const method = e.requestContext?.http?.method ?? 'GET';
  const path = e.requestContext?.http?.path ?? e.rawPath ?? '/';
  const a = await auth(e);
  if (!a) return method === 'GET' ? html(400, renderError(ev, '链接无效或已过期', '请使用邮件中的完整链接，或回复邮件联系组委会。')) : json(401, { error: '链接无效或已过期' });
  const { who, table, rec } = a;
  const id = rec.record_id;
  try {
    if (method === 'GET') {
      const reviews: Record<string, string> = { photo: f(rec, '照片审核'), deck: f(rec, 'PPT 审核') };
      return html(200, renderPage(ev, who, {
        name: f(rec, '姓名') || f(rec, '联系人') || f(rec, '公司'),
        talk: f(rec, '议题'),
        track: (() => { const tr = ev.tracks.find((x) => x.id === f(rec, '赛道')); return tr ? t(tr.name) : f(rec, '赛道'); })(),
        minutes: who === 'speaker' ? talkMinutes(rec) : 0,
        status: f(rec, '状态'),
        level: f(rec, '难度等级'),
        photo: f(rec, '照片'),
        deck: f(rec, 'PPT 初稿'),
        deckFinal: f(rec, 'PPT 终稿'),
        logo: f(rec, 'Logo'),
        reviews,
      }));
    }
    const body = bodyJson<Record<string, string | number | undefined>>(e);
    if (path.endsWith('/presign')) {
      const kind = String(body.kind) as Kind;
      if (!KINDS[who].includes(kind)) return json(400, { error: '不支持的文件类型' });
      const size = Number(body.size);
      const name = String(body.filename ?? '');
      const fx = kind === 'photo' ? 'jpg' : ext(name);
      if (kind === 'photo' && (body.contentType !== 'image/jpeg' || size > ev.materials.photo.maxBytes)) return json(400, { error: '照片需在页面裁剪后上传' });
      if ((kind === 'deck' || kind === 'deckFinal') && (![...ev.materials.deck.formats, 'pdf'].includes(fx as 'pdf') || size > ev.materials.deck.maxBytes)) {
        return json(400, { error: `仅支持 ${ev.materials.deck.formats.join(' / ')}，且不超过 ${Math.round(ev.materials.deck.maxBytes / 1048576)}MB` });
      }
      if (kind === 'logo' && (!LOGO_EXT.includes(fx) || size > LOGO_MAX)) return json(400, { error: `Logo 支持 ${LOGO_EXT.join(' / ')}，不超过 30MB` });
      if (!Number.isFinite(size) || size <= 0) return json(400, { error: '文件为空' });
      const key = `staging/${id}/${kind}-${Date.now()}.${fx}`;
      const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket: ASSETS_BUCKET, Key: key, ContentType: String(body.contentType || 'application/octet-stream'), ContentLength: size }), { expiresIn: 600 });
      return json(200, { url, key });
    }
    if (path.endsWith('/review')) {
      const kind = String(body.kind) as Kind;
      const key = String(body.key ?? '');
      if (!KINDS[who].includes(kind) || !key.startsWith(`staging/${id}/${kind}-`)) return json(400, { error: '参数错误' });
      const review = kind === 'photo' ? await reviewPhotoKey(key) : kind === 'logo' ? await reviewLogoKey(key) : await reviewDeckKey(kind, key, rec);
      await s3.send(new PutObjectCommand({ Bucket: ASSETS_BUCKET, Key: `${key}.review.json`, Body: JSON.stringify(review), ContentType: 'application/json' }));
      return json(200, review);
    }
    if (path.endsWith('/submit')) {
      try {
        return json(200, await submit(who, table, rec, body as Record<string, string | undefined>));
      } catch (err) {
        return json(400, { error: (err as Error).message });
      }
    }
    if (path.endsWith('/decline') && who === 'speaker') {
      if (!['已通知', '已确认'].includes(f(rec, '状态'))) return json(400, { error: '当前状态无法操作' });
      await feishu.updateRecord(APP, table, id, { 状态: '已婉拒' });
      return json(200, { ok: true });
    }
    return json(404, { error: 'not found' });
  } catch (err) {
    console.error(`${method} ${path}`, err);
    return json(500, { error: '服务暂时不可用，请稍后重试或回复邮件联系组委会' });
  }
}
