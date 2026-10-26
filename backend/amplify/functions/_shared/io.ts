/** Lambda 侧 I/O：飞书客户端、发信通道、Function URL 响应工具。 */
import { Feishu } from '@cdkit/feishu';

const { FEISHU_APP_ID = '', FEISHU_APP_SECRET = '', EMAIL_LINK = '', EMAIL_KEY = '' } = process.env;

export const feishu = new Feishu(FEISHU_APP_ID, FEISHU_APP_SECRET);

/** 共用 send-email HTTP API（与 2026 秋相同的通道：EMAIL_LINK + x-api-key） */
export async function sendMail(m: { from: string; to: string; subject: string; text: string; html: string }): Promise<void> {
  if (!EMAIL_LINK) throw new Error('EMAIL_LINK 未配置');
  const res = await fetch(EMAIL_LINK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(EMAIL_KEY ? { 'x-api-key': EMAIL_KEY } : {}) },
    body: JSON.stringify({ from: m.from, to: m.to, cc: '', bcc: '', subject: m.subject, text_body: m.text, html_body: m.html, attachments: [] }),
  });
  const data = (await res.json().catch(() => ({}))) as { success?: boolean };
  if (!res.ok || data.success === false) throw new Error(`send-email 失败：HTTP ${res.status} ${JSON.stringify(data)}`);
}

export interface UrlEvent {
  rawPath?: string;
  body?: string;
  isBase64Encoded?: boolean;
  queryStringParameters?: Record<string, string | undefined>;
  requestContext?: { http?: { method?: string; path?: string } };
}

export const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

export const html = (statusCode: number, body: string) => ({
  statusCode,
  headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
  },
  body,
});

export function bodyJson<T = Record<string, unknown>>(e: UrlEvent): T {
  if (!e.body) return {} as T;
  const text = e.isBase64Encoded ? Buffer.from(e.body, 'base64').toString('utf8') : e.body;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}
