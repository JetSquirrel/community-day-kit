/**
 * 无状态 HMAC 链接令牌：<recordId>.<ts>.<sig>。
 * purpose 参与签名（speaker / sponsor），防止 A 类链接被拿去访问 B 类页面；
 * purpose 为空时与 2026 秋 volunteer-accept-mailer 的格式完全兼容（admin-api 的志愿者指引页沿用）。
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const TOKEN_MAX_AGE_MS = 60 * 24 * 3600 * 1000;

const msg = (purpose: string, recordId: string, ts: string) => (purpose ? `${purpose}:${recordId}.${ts}` : `${recordId}.${ts}`);

export function signToken(recordId: string, secret: string, purpose = '', now = Date.now()): string {
  const ts = String(Math.floor(now / 1000));
  const sig = createHmac('sha256', secret).update(msg(purpose, recordId, ts)).digest('base64url');
  return `${recordId}.${ts}.${sig}`;
}

export function verifyToken(token: string | undefined, secret: string, purpose = '', now = Date.now()): string | null {
  const parts = String(token ?? '').split('.');
  if (parts.length !== 3) return null;
  const [recordId, ts, sig] = parts;
  if (!recordId || !/^\d+$/.test(ts) || now - Number(ts) * 1000 > TOKEN_MAX_AGE_MS) return null;
  const expected = createHmac('sha256', secret).update(msg(purpose, recordId, ts)).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? recordId : null;
}
