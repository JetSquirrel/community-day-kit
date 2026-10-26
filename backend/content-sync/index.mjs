/**
 * Feishu bitable → S3 content sync (Bridge with Signal site).
 *
 * Reads the speakers & sponsors tables from a Feishu bitable and writes
 * speakers.json / sponsors.json into the content bucket. The site fetches
 * those at runtime, so content edits go live without a rebuild.
 *
 * Triggers (both supported by this handler):
 *   - EventBridge schedule (default: every 5 min, see template.yaml)
 *   - HTTPS function URL for instant sync — Feishu bitable automation posts
 *     here; requires `?token=$SYNC_TOKEN`. Feishu URL-verification challenges
 *     are answered automatically.
 *
 * Zero npm dependencies: fetch is global on nodejs20.x, and the AWS SDK v3
 * S3 client ships with the Lambda runtime.
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { mapSpeaker, mapPartner } from './mapping.mjs';

const {
  FEISHU_APP_ID,
  FEISHU_APP_SECRET,
  FEISHU_BITABLE_APP_TOKEN,
  FEISHU_SPEAKERS_TABLE_ID,
  FEISHU_SPONSORS_TABLE_ID,
  S3_BUCKET,
  S3_PREFIX = 'content',
  SYNC_TOKEN,
} = process.env;

const FEISHU_BASE = 'https://open.feishu.cn/open-apis';
const s3 = new S3Client({});

// tenant token cached per warm container (expire minus a 5 min margin)
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

async function listRecords(tableId) {
  const token = await tenantToken();
  const items = [];
  let pageToken;
  do {
    const url = new URL(`${FEISHU_BASE}/bitable/v1/apps/${FEISHU_BITABLE_APP_TOKEN}/tables/${tableId}/records`);
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

async function putJson(name, data) {
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: `${S3_PREFIX}/${name}`,
      Body: JSON.stringify(data, null, 2),
      ContentType: 'application/json; charset=utf-8',
      CacheControl: 'public, max-age=60',
    }),
  );
}

async function sync() {
  const [speakerRecords, sponsorRecords] = await Promise.all([
    listRecords(FEISHU_SPEAKERS_TABLE_ID),
    listRecords(FEISHU_SPONSORS_TABLE_ID),
  ]);
  const speakers = speakerRecords.map((r) => mapSpeaker(r.fields)).filter(Boolean);
  const partners = sponsorRecords
    .map((r) => mapPartner(r.fields))
    .filter(Boolean)
    .map((p, i) => ({ ...p, id: p.id || `p-${i + 1}` }));
  await Promise.all([putJson('speakers.json', speakers), putJson('sponsors.json', partners)]);
  return { speakers: speakers.length, partners: partners.length };
}

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export async function handler(event) {
  // Feishu event-subscription URL verification
  if (event?.body) {
    try {
      const body = JSON.parse(event.body);
      if (body.type === 'url_verification') return json(200, { challenge: body.challenge });
    } catch {
      /* not JSON — fall through */
    }
  }
  // HTTP triggers must carry the shared secret — fail closed when unset
  if (event?.requestContext) {
    if (!SYNC_TOKEN || SYNC_TOKEN.length < 16) {
      return json(503, { ok: false, error: 'sync token not configured' });
    }
    if (event.queryStringParameters?.token !== SYNC_TOKEN) {
      return json(401, { ok: false, error: 'invalid token' });
    }
  }
  try {
    const result = await sync();
    console.log('synced', result);
    return json(200, { ok: true, ...result });
  } catch (err) {
    console.error('sync failed', err);
    return json(500, { ok: false, error: 'internal error' });
  }
}
