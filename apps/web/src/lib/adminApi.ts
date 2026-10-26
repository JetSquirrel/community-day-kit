/**
 * Client for the admin API (amplify/functions/admin-api).
 * Session lives in localStorage as an HMAC-signed token (7 days, server-checked
 * on every call). VITE_ADMIN_API_URL points at the Lambda Function URL.
 */

const API = (import.meta.env.VITE_ADMIN_API_URL as string | undefined)?.replace(/\/+$/, '') ?? '';
const KEY = 'bws_admin_session';

export const adminConfigured = API !== '';

export interface AdminSession {
  token: string;
  name: string;
  picture: string;
  exp: number;
}

export interface Submission {
  recordId: string;
  name: string;
  email: string;
  talk: string;
  status: string;
  extra: Record<string, string>;
}

export interface Overview {
  submissions: Record<string, number>;
  speakers: number;
  partners: number;
}

export class AdminApiError extends Error {
  status: number;
  data?: { openId?: string };

  constructor(status: number, message: string, data?: { openId?: string }) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function parseExp(token: string): number {
  try {
    const b64 = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64)) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : 0;
  } catch {
    return 0;
  }
}

export function getSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as AdminSession;
    return s.token && s.exp > Date.now() ? s : null;
  } catch {
    return null;
  }
}

export function saveSession(token: string, name: string, picture: string): AdminSession {
  const s: AdminSession = { token, name, picture, exp: parseExp(token) };
  localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}

async function apiFetch<T>(path: string, options: RequestInit = {}, auth = true): Promise<T> {
  const s = getSession();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      // FormData 由浏览器自动带 boundary 的 Content-Type
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(auth && s ? { Authorization: `Bearer ${s.token}` } : {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; Message?: string; openId?: string };
  // AWS 平台层错误（如请求体超 Lambda 上限）用的是 Message 字段而非 error
  if (!res.ok) throw new AdminApiError(res.status, data.error ?? data.Message ?? `HTTP ${res.status}`, data);
  return data as T;
}

export async function fetchAuthUrl(): Promise<string> {
  const data = await apiFetch<{ url: string }>('/auth/url', {}, false);
  return data.url;
}

export async function login(code: string, state: string): Promise<AdminSession> {
  const data = await apiFetch<{ token: string; name: string; picture: string }>(
    '/auth/callback',
    { method: 'POST', body: JSON.stringify({ code, state }) },
    false,
  );
  return saveSession(data.token, data.name, data.picture);
}

export const fetchOverview = () => apiFetch<Overview>('/api/overview');
export const fetchSubmissions = () => apiFetch<{ submissions: Submission[] }>('/api/submissions');
export const setSubmissionStatus = (recordId: string, status: string) =>
  apiFetch<{ ok: true }>('/api/submissions/status', { method: 'POST', body: JSON.stringify({ recordId, status }) });
export const triggerSync = () => apiFetch<{ ok: boolean }>('/api/sync', { method: 'POST' });
// ——— 发信台（cdkit outbox）：生成批次 → 核对名单与名额 → 输入人数确认 → 发送 ———

export type OutboxTemplate = 'cfp-accept' | 'cfp-waitlist' | 'cfp-decline' | 'volunteer-accept' | 'sponsor-accept';

export interface QuotaLine {
  track: string;
  quota: number;
  committed: number;
  pending: number;
  remaining: number;
  over: number;
}

export interface OutboxBatch {
  id: string;
  template: OutboxTemplate;
  digest: string;
  createdAt: string;
  skippedAlreadySent: number;
  recipients: { recordId: string; email: string; name: string; track?: string; talk: string }[];
  quota: { ok: boolean; lines: QuotaLine[]; unknownTracks: string[]; total: { quota: number; committed: number; pending: number } } | null;
  preview: { subject: string; html: string } | null;
}

export interface OutboxResult {
  batchId: string;
  sent: string[];
  skipped: string[];
  failed: { recordId: string; error: string }[];
}

export const outboxPlan = (template: OutboxTemplate) =>
  apiFetch<{ ok: boolean; batch: OutboxBatch; error?: string }>('/api/outbox/plan', { method: 'POST', body: JSON.stringify({ template }) });

export const outboxSend = (a: { batchId: string; digest: string; confirmCount: number; overrideReason?: string }) =>
  apiFetch<{ ok: boolean; result: OutboxResult; error?: string }>('/api/outbox/send', { method: 'POST', body: JSON.stringify(a) });

export const outboxRelease = (template: OutboxTemplate, recordId: string) =>
  apiFetch<{ ok: boolean }>('/api/outbox/release', { method: 'POST', body: JSON.stringify({ template, recordId }) });

/** Public CFP submission — no session (amplify/functions/admin-api /cfp/submit). */
export interface CfpPayload {
  name: string;
  email: string;
  /** optional — urgent contact only */
  phone?: string;
  talk: string;
  track: string;
  format: string;
  abstract: string;
  bio: string;
  /** optional — values from the 社区身份 chips (see ApplyForm COMMUNITY_TITLES) */
  communityTitle?: string[];
  /** honeypot — must stay empty; bots that fill it get a fake success */
  website?: string;
}

export const submitCfp = (payload: CfpPayload) =>
  apiFetch<{ ok: true }>('/cfp/submit', { method: 'POST', body: JSON.stringify(payload) }, false);

/** Public volunteer application — no session (amplify/functions/admin-api /volunteer/submit). */
export interface VolunteerPayload {
  name: string;
  email: string;
  /** optional — urgent contact only */
  phone?: string;
  /** zh role name, must match admin-api VOLUNTEER_ROLES */
  role: string;
  /** optional — availability / experience */
  note?: string;
  /** honeypot — must stay empty */
  website?: string;
}

export const submitVolunteer = (payload: VolunteerPayload) =>
  apiFetch<{ ok: true }>('/volunteer/submit', { method: 'POST', body: JSON.stringify(payload) }, false);

/** 守桥人指引页（公共，邮件 token 即凭证）→ GET /volunteer/me */
export interface VolunteerMe {
  name: string;
  role: string;
  status: string;
}

export const fetchVolunteerMe = (token: string) =>
  apiFetch<VolunteerMe>(`/volunteer/me?token=${encodeURIComponent(token)}`, {}, false);

// ——— 志愿者审核（/admin 志愿者 tab）———

export interface Volunteer {
  recordId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  note: string;
  status: string;
}

export const fetchVolunteers = () => apiFetch<{ rows: Volunteer[] }>('/api/volunteers');
export const setVolunteerStatus = (recordId: string, status: string) =>
  apiFetch<{ ok: true }>('/api/volunteers/status', { method: 'POST', body: JSON.stringify({ recordId, status }) });
/** 立即通知志愿者 — admin-api invokes volunteer-accept-mailer with {"force": true}, skipping NOTIFY_AT. */


/** Public sponsor application — no session (amplify/functions/admin-api /sponsor/submit). */
export interface SponsorPayload {
  company: string;
  contact: string;
  email: string;
  /** optional */
  phone?: string;
  /** zh tier name, must match admin-api SPONSOR_TIERS */
  tier: string;
  /** optional */
  note?: string;
  /** honeypot — must stay empty */
  website?: string;
}

export const submitSponsor = async (payload: SponsorPayload, logo?: File | null) => {
  if (!logo) return apiFetch<{ ok: true }>('/sponsor/submit', { method: 'POST', body: JSON.stringify(payload) }, false);
  const fd = new FormData();
  for (const [k, v] of Object.entries(payload)) if (v !== undefined && v !== null) fd.append(k, String(v));
  fd.append('logo', ensureImageSize(await downscaleImage(logo, 800)));
  return apiFetch<{ ok: true }>('/sponsor/submit', { method: 'POST', body: fd }, false);
};

/** 过桥须知订阅（场地已公布，现为「报名开启时通知我」）→ 飞书订阅表（服务端去重）。website 为蜜罐字段。 */
export const subscribe = (email: string, website = '') =>
  apiFetch<{ ok: true }>('/subscribe', { method: 'POST', body: JSON.stringify({ email, website, source: '过桥须知' }) }, false);

// ——— CRM (讲师 / 赞助商) + CMS 图片上传 ———

export interface CrmSpeaker {
  recordId: string;
  id: string;
  name: string;
  nameEn: string;
  company: string;
  role: string;
  track: string;
  time: string;
  talk: string;
  bio: string;
  featured: boolean;
  show: boolean;
  photo: string;
}

export interface CrmSponsor {
  recordId: string;
  id: string;
  name: string;
  url: string;
  tier: string;
  status: string;
  logo: string;
  show: boolean;
}

export const fetchCrmSpeakers = () => apiFetch<{ rows: CrmSpeaker[] }>('/api/crm/speakers');
export const fetchCrmSponsors = () => apiFetch<{ rows: CrmSponsor[] }>('/api/crm/sponsors');

export const updateCrm = (table: 'speakers' | 'sponsors', recordId: string, fields: Record<string, string | boolean>) =>
  apiFetch<{ ok: true }>('/api/crm/update', { method: 'POST', body: JSON.stringify({ table, recordId, fields }) });

/** 与服务端 MAX_IMAGE_BYTES 一致；超过 Lambda 6MB 上限的请求会被 AWS 直接拒掉，连友好错误都返回不了。 */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function ensureImageSize(file: File): File {
  if (file.size > MAX_IMAGE_BYTES) throw new Error('图片超过 4MB，请压缩后重试');
  return file;
}

/** 图片上传前压缩：最长边压到 maxEdge（原图动辄 2–3MB，会拖慢页面甚至撞上 Lambda 上限）。解码失败/没变大则原样上传。 */
async function downscaleImage(file: File, maxEdge: number): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size <= 400 * 1024) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  if (scale >= 1) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.82));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name, { type });
}

/** CMS：上传讲者照片 / 赞助商 Logo，直接回写 CDN URL 到飞书（随下次内容同步上站）。位图先经 downscaleImage 压缩，SVG 原样上传但同样受 4MB 限制。 */
export const uploadImage = async (kind: 'speaker' | 'sponsor', recordId: string, file: File) => {
  const fd = new FormData();
  fd.append('kind', kind);
  fd.append('recordId', recordId);
  fd.append('file', ensureImageSize(await downscaleImage(file, kind === 'speaker' ? 640 : 800)));
  return apiFetch<{ ok: true; url: string }>('/api/upload', { method: 'POST', body: fd });
};
