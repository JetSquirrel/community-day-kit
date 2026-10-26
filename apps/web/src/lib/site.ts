/**
 * Shared site constants — single source for nav, CTAs and meta.
 * 全部来自 events/<slug>/event.yaml（经 `cdkit use <slug>` 生成 src/event.generated.json），换一届不改这里。
 * 导航与征稿 / 赞助入口按日期自动开关：不再需要手动改 cfpOpen、注释路由。
 */
import EVENT from '@/event.generated.json';

type L = string | { zh: string; en?: string };
const zh = (v: L) => (typeof v === 'string' ? v : v.zh);
const en = (v: L) => (typeof v === 'string' ? v : v.en || v.zh);

const WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WEEK_ZH = ['日', '一', '二', '三', '四', '五', '六'];
const [y, m, d] = EVENT.date.split('-');
const dow = new Date(Date.UTC(+y, +m - 1, +d)).getUTCDay();
const weekday = WEEK[dow];
const fmtDeadline = (iso: string) => iso.replace(/-/g, '.');

/** 活动时区的今天 YYYY-MM-DD（构建期与运行期都按浏览器时间判断，足够做入口开关） */
const today = new Intl.DateTimeFormat('en-CA', { timeZone: EVENT.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export const EVENT_CONFIG = EVENT;

export const PHASE = {
  cfpOpen: today >= EVENT.deadlines.cfpOpen && today <= EVENT.deadlines.cfpClose,
  /** 赞助招募入口：材料截止前开放 */
  sponsorsOpen: today <= EVENT.deadlines.sponsorMaterials,
  /** 议程冻结后首页 / 导航优先展示日程 */
  agendaLive: today >= EVENT.deadlines.agendaFreeze,
  past: today > EVENT.date,
};

export const SITE = {
  name: en(EVENT.slogan),
  nameCn: zh(EVENT.slogan),
  event: zh(EVENT.name),
  eventEn: en(EVENT.name),
  date: EVENT.date.replace(/-/g, '.'),
  dateChip: `${m}.${d} ${weekday}`,
  weekday,
  /** 2026 年 10 月 17 日（周六） */
  dateLong: `${y} 年 ${+m} 月 ${+d} 日（周${WEEK_ZH[dow]}）`,
  city: zh(EVENT.city),
  cityEn: en(EVENT.city),
  /** 去掉「中国 · 」前缀的城市名，用于海报 / 话题 */
  cityShort: zh(EVENT.city).replace(/^中国\s*·\s*/, ''),
  domain: EVENT.domain,
  venue: EVENT.venue,
  cfpClose: fmtDeadline(EVENT.deadlines.cfpClose),
  /** 推文话题 */
  hashtags: `#AWSCommunityDay #${en(EVENT.slogan).replace(/\s+/g, '')} #${zh(EVENT.city).replace(/^中国\s*·\s*/, '')}`,
  email: EVENT.contactEmail,
  /** 报名链接：为 null 时各处报名按钮自动隐藏 */
  registerUrl: EVENT.registerUrl as string | null,
  /** CFP 投稿开关：按 deadlines.cfpOpen ~ cfpClose 自动计算 */
  cfpOpen: PHASE.cfpOpen as boolean,
} as const;

/** Nav labels live in i18n (`nav.${id}` in common.json); `to` is the zh path — wrap with useLocalePath() for en. */
export interface NavItem {
  id: 'overview' | 'schedule' | 'speakers' | 'cfp' | 'sponsors' | 'volunteers' | 'faq' | 'past';
  to: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', to: '/' },
  { id: 'schedule', to: '/schedule' },
  { id: 'speakers', to: '/speakers' },
  ...(PHASE.cfpOpen ? [{ id: 'cfp' as const, to: '/cfp' }] : []),
  ...(PHASE.sponsorsOpen ? [{ id: 'sponsors' as const, to: '/sponsors' }] : []),
  { id: 'volunteers', to: '/volunteers' },
  { id: 'faq', to: '/faq' },
  { id: 'past', to: '/past' },
];
