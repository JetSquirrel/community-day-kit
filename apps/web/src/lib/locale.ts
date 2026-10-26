/**
 * Locale primitives shared by every page (Phase 1 of the i18n rollout).
 *
 * Routing contract: zh is the default and keeps unprefixed paths; en lives
 * under /en. Layout syncs i18n.language with the URL prefix, so hooks below
 * derive everything from the active i18next language.
 *
 * Data contract: bundled bilingual content stores text as LText; remote
 * content (Feishu → S3 sync) is zh-only plain strings. LTextLike covers both
 * and pick() accepts either — consumers never care which side data came from.
 */
import { useTranslation } from 'react-i18next';

export type Locale = 'zh' | 'en';

// ——— 语言偏好（IP 自动识别 + 手动切换记忆） ———

const LANG_KEY = 'bws_lang';

/** 已保存的语言偏好；null = 还没识别过也没手动切过（Layout 会按 IP 识别一次）。 */
export function getLangPref(): Locale | null {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return v === 'en' || v === 'zh' ? v : null;
  } catch {
    return null;
  }
}

export function setLangPref(locale: Locale): void {
  try {
    localStorage.setItem(LANG_KEY, locale);
  } catch {
    /* private mode — 识别结果仅本次生效 */
  }
}

/**
 * 按 IP 归属地识别语言：中国 → zh，其他 → en。失败（接口不可达/超时）回退 zh。
 * 使用 ipwho.is（免费、HTTPS、无需 key）。
 */
export async function detectLocaleByIp(timeoutMs = 3000): Promise<Locale> {
  try {
    const res = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(timeoutMs) });
    const data = (await res.json()) as { success?: boolean; country_code?: string };
    return data.success && data.country_code && data.country_code !== 'CN' ? 'en' : 'zh';
  } catch {
    return 'zh';
  }
}

/** Bilingual text: zh is required, en falls back to zh when absent. */
export interface LText {
  zh: string;
  en?: string;
}

/** Bundled LText or a plain (zh-only) remote string. */
export type LTextLike = LText | string;

/** Active locale, derived from i18n.language ('en*' → en, everything else zh). */
export function useLocale(): Locale {
  const { i18n } = useTranslation();
  return i18n.language.startsWith('en') ? 'en' : 'zh';
}

/** Resolve a field for display: strings pass through, LText picks by locale. */
export function pick(field: LTextLike, locale: Locale): string {
  if (typeof field === 'string') return field;
  return locale === 'en' && field.en ? field.en : field.zh;
}

/** Prefix internal absolute paths with /en when the en locale is active. */
export function useLocalePath(): (to: string) => string {
  const locale = useLocale();
  return (to: string) => {
    if (locale !== 'en') return to;
    return to === '/' ? '/en' : `/en${to}`;
  };
}
