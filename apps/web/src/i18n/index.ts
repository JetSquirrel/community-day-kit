/**
 * i18n entry — imported once from main.tsx.
 *
 * All resources are bundled and eager (no HTTP backend), so changeLanguage()
 * applies synchronously. Namespaces other than `common` are empty placeholders
 * for Phase 2; they are already registered here so this file stays untouched.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import commonZh from './locales/zh/common.json';
import homeZh from './locales/zh/home.json';
import scheduleZh from './locales/zh/schedule.json';
import speakersZh from './locales/zh/speakers.json';
import cfpZh from './locales/zh/cfp.json';
import sponsorsZh from './locales/zh/sponsors.json';
import volunteersZh from './locales/zh/volunteers.json';
import faqZh from './locales/zh/faq.json';
import pastZh from './locales/zh/past.json';

import commonEn from './locales/en/common.json';
import homeEn from './locales/en/home.json';
import scheduleEn from './locales/en/schedule.json';
import speakersEn from './locales/en/speakers.json';
import cfpEn from './locales/en/cfp.json';
import sponsorsEn from './locales/en/sponsors.json';
import volunteersEn from './locales/en/volunteers.json';
import faqEn from './locales/en/faq.json';
import pastEn from './locales/en/past.json';

const resources: Record<string, Record<string, Record<string, unknown>>> = {
    zh: {
      common: commonZh,
      home: homeZh,
      schedule: scheduleZh,
      speakers: speakersZh,
      cfp: cfpZh,
      sponsors: sponsorsZh,
      volunteers: volunteersZh,
      faq: faqZh,
      past: pastZh,
    },
    en: {
      common: commonEn,
      home: homeEn,
      schedule: scheduleEn,
      speakers: speakersEn,
      cfp: cfpEn,
      sponsors: sponsorsEn,
      volunteers: volunteersEn,
      faq: faqEn,
      past: pastEn,
    },
};

/** 站点名 / 城市 / 日期 / meta 由 event.yaml 生成，不再写死在 common.json */
import EVENT from '@/event.generated.json';
import { SITE } from '@/lib/site';
const L = (v: string | { zh: string; en?: string }, lng: 'zh' | 'en') => (typeof v === 'string' ? v : lng === 'en' ? v.en || v.zh : v.zh);
for (const lng of ['zh', 'en'] as const) {
  const common = resources[lng].common as Record<string, Record<string, string>>;
  common.site = { ...common.site, event: L(EVENT.name, lng), city: L(EVENT.city, lng), dateChip: SITE.dateChip, ...(lng === 'zh' ? { nameCn: SITE.nameCn } : {}) };
  common.meta = {
    ...common.meta,
    title: `${SITE.name} — ${L(EVENT.name, lng)}`,
    description:
      lng === 'zh'
        ? `${SITE.name} · ${SITE.nameCn} — ${L(EVENT.name, 'zh')}。${SITE.date}，${EVENT.expectedAttendees}+ 开发者，${EVENT.tracks.length} 个分论坛。`
        : `${SITE.name} — ${L(EVENT.name, 'en')}. ${SITE.date}, ${EVENT.expectedAttendees}+ developers, ${EVENT.tracks.length} tracks.`,
  };
}

/**
 * 每届文案覆盖层：events/<slug>/site/locales/<lng>/<ns>.json 深合并到上面的基础文案。
 * 只需写有变化的键（Hero 标语、FAQ 场地交通、往届回顾新增一条…），模板文案保持不动。
 */
type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);
function merge(base: Json, over: Json): Json {
  const out: Json = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = isObj(v) && isObj(base[k]) ? merge(base[k] as Json, v) : v;
  return out;
}
const overlays = import.meta.glob<{ default: Json }>('@event/locales/*/*.json', { eager: true });
for (const [file, mod] of Object.entries(overlays)) {
  const m = /locales\/([^/]+)\/([^/]+)\.json$/.exec(file);
  if (!m) continue;
  const [, lng, ns] = m;
  resources[lng] ??= {};
  resources[lng][ns] = merge(resources[lng][ns] ?? {}, mod.default);
}

void i18n.use(initReactI18next).init({
  lng: 'zh',
  fallbackLng: 'zh',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  resources,
});

export default i18n;
