/**
 * Pure mappers: Feishu bitable record `fields` → site content JSON.
 * No I/O here — unit-testable locally with plain Node (mapping.test.mjs).
 *
 * Bitable value shapes handled by asText():
 *   text        → [{ text: '...' }] or '...'
 *   single sel  → '选项'
 *   url/link    → { text, link }
 *   number      → 123
 */

export function asText(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(asText).join('').trim();
  if (typeof v === 'object') return asText(v.text ?? v.link ?? v.name ?? '');
  return '';
}

/** URL/link fields: prefer the actual href over its display text; only http(s). */
export function asLink(v) {
  const raw =
    v != null && typeof v === 'object' && !Array.isArray(v) && typeof v.link === 'string'
      ? v.link.trim()
      : asText(v);
  if (!raw) return '';
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
    return raw; // keep original spelling (avoid URL.toString() adding trailing /)
  } catch {
    return '';
  }
}

/** Multi-line text, one link per line: "GitHub https://…" → [{label, href}] */
export function parseSocials(text) {
  return asText(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.+?)[\s|]+(https?:\/\/\S+)$/);
      return m ? { label: m[1].trim(), href: m[2] } : null;
    })
    .filter(Boolean);
}

const TRACK_IDS = new Set(['keynote', 'ai', 'builder', 'spark', 'global']);

function deriveInitials(nameEn) {
  const latin = nameEn.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
  if (latin.length > 0) return latin.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  return nameEn.slice(0, 2).toUpperCase();
}

/**
 * Speakers table columns (exact names — see README):
 *   ID, 姓名, 英文名, 缩写, 公司, 职位, 赛道, 主推, 议题, 简介, 社交链接, 展示
 * Optional English columns (silently skipped when absent or empty):
 *   英文公司, 英文职位, 英文议题, 英文简介
 * Rows without ID/姓名, or with 展示 unchecked, are skipped (drafts).
 *
 * Output text fields are plain zh strings, or { zh, en } when the matching
 * English column exists — the frontend's LTextLike type accepts both.
 * `name` stays a plain string; en display uses `nameEn`.
 */

/** Wrap zh text with its English counterpart when one was provided. */
function withEn(zh, en) {
  return en ? { zh, en } : zh;
}

export function mapSpeaker(fields) {
  if (fields['展示'] !== undefined && fields['展示'] !== true) return null;
  const id = asText(fields['ID']);
  const name = asText(fields['姓名']);
  if (!id || !name) return null;
  const nameEn = asText(fields['英文名']) || name;
  const track = asText(fields['赛道']);
  return {
    id,
    name,
    nameEn,
    initials: asText(fields['缩写']) || deriveInitials(nameEn),
    company: withEn(asText(fields['公司']), asText(fields['英文公司'])),
    role: withEn(asText(fields['职位']), asText(fields['英文职位'])),
    track: TRACK_IDS.has(track) ? track : 'ai',
    featured: fields['主推'] === true,
    talk: withEn(asText(fields['议题']), asText(fields['英文议题'])),
    bio: withEn(asText(fields['简介']), asText(fields['英文简介'])),
    // CMS 上传的讲者照片（CDN URL）；有才带此字段，前端回退到几何字母头像
    ...(asText(fields['照片']) ? { photo: asText(fields['照片']) } : {}),
    // 排期时段，如 "13:30–14:05"；有才带此字段，前端用它派生时间表
    ...(asText(fields['时间']) ? { time: asText(fields['时间']) } : {}),
    socials: parseSocials(fields['社交链接']),
  };
}

/**
 * Sponsors table columns: ID, 名称, 官网, Logo, 展示
 * Logo is a plain URL (upload the image to the bucket or any public host).
 * 2026 秋起赞助商报名表兼作展示表：表单写入的是「公司」列，因此「名称」为空时
 * 回退到「公司」——组委会审核后补 ID/官网 并勾选「展示」即可上站。
 */
export function mapPartner(fields) {
  if (fields['展示'] !== undefined && fields['展示'] !== true) return null;
  const name = asText(fields['名称']) || asText(fields['公司']);
  if (!name) return null;
  return {
    id: asText(fields['ID']),
    name,
    url: asLink(fields['官网']) || undefined,
    logo: asText(fields['Logo']) || undefined,
    // 档位（钻石/铂金/金牌/银牌赞助）——首页赞助墙按档分区用
    ...(asText(fields['意向档位']) ? { tier: asText(fields['意向档位']) } : {}),
  };
}
