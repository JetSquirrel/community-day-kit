/**
 * event.yaml 的唯一 schema。官网、后端、CLI、AI 助手全部只读这一份配置——
 * 换一届活动 = 复制 events/_template 改这个文件（+ 站点覆盖层里的 KV / 文案）。
 *
 * 设计原则（来自 2026 秋深圳场复盘）：
 * - 名额（quota）写进配置，发信前强制校验 → 杜绝「需要 18 位实际发出 29 封」；
 * - 讲者材料规格（照片 / PPT）写进配置，上传页把规格「先展示、再上传、AI 预审」；
 * - 所有截止日期写成绝对日期，倒排计划由 playbook 的 D-N 偏移自动推出。
 */
import { z } from 'zod';
import { addDays, diffDays } from './dates.ts';

/** 双语文本：中文必填，英文可选（缺省回退中文） */
export const LText = z.union([z.string(), z.object({ zh: z.string(), en: z.string().optional() })]);
export type LText = z.infer<typeof LText>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD');
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, '颜色应为 #RRGGBB');

export const Track = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  name: LText,
  /** 英文副标题，如 AI SIGNAL */
  signal: z.string().default(''),
  color: hex,
  textOn: hex.default('#FFFFFF'),
  /** 论坛出品人 / 主理人（名字即可，用于提醒与待办分派） */
  owners: z.array(z.string()).default([]),
  /** 本论坛可录用的讲题数量上限——发录用邮件前强制校验 */
  quota: z.number().int().nonnegative(),
  /** 默认会场 */
  room: z.string().optional(),
});
export type Track = z.infer<typeof Track>;

export const Room = z.object({
  id: z.string(),
  name: z.string(),
  floor: z.string().optional(),
  capacity: z.number().int().positive(),
  kind: z.enum(['keynote', 'session', 'workshop', 'booth', 'lounge', 'storage', 'other']).default('session'),
  /** 可用时段，如 am / pm / all */
  availability: z.enum(['am', 'pm', 'all']).default('all'),
});

export const Format = z.object({
  id: z.string(),
  label: z.string(),
  minutes: z.number().int().positive(),
});

export const SponsorTier = z.object({
  id: z.string(),
  name: z.string(),
  booth: z.boolean().default(false),
  /** 赞助权益：演讲席位数（keynote / session / lightning） */
  talkSlots: z.number().int().nonnegative().default(0),
  /** 官网 logo 尺寸档：xl / lg / md / sm */
  logoSize: z.enum(['xl', 'lg', 'md', 'sm']).default('md'),
});

export const PhotoSpec = z.object({
  /** 宽高比（宽/高），海报使用 4:5 竖版 */
  aspect: z.tuple([z.number().positive(), z.number().positive()]).default([4, 5]),
  minWidth: z.number().int().positive().default(800),
  minHeight: z.number().int().positive().default(1000),
  maxBytes: z.number().int().positive().default(8 * 1024 * 1024),
  formats: z.array(z.enum(['image/jpeg', 'image/png', 'image/webp'])).default(['image/jpeg', 'image/png', 'image/webp']),
  /** 写给讲者看的拍摄要求，上传页原样展示，同时作为 AI 审核规则 */
  guidelines: z.array(z.string()).default([]),
});
export type PhotoSpec = z.infer<typeof PhotoSpec>;

export const DeckSpec = z.object({
  templateUrl: z.string().url().optional(),
  maxBytes: z.number().int().positive().default(100 * 1024 * 1024),
  formats: z.array(z.enum(['pptx', 'pdf', 'key'])).default(['pptx', 'pdf']),
  /** 每分钟最多页数（超出视为内容过满） */
  maxSlidesPerMinute: z.number().positive().default(1.5),
  /** 命中即需人工确认的词（竞品平台名、违规用语等） */
  flaggedTerms: z.array(z.string()).default([]),
  /** 模板识别：首/末页需出现的文字（如活动名），未出现提示「可能未使用官方模板」 */
  templateMarkers: z.array(z.string()).default([]),
  /** 写给讲者看的 PPT 规范，上传页先展示，AI 按此逐条审核 */
  rules: z.array(z.string()).default([]),
});
export type DeckSpec = z.infer<typeof DeckSpec>;

export const Reminder = z.object({
  id: z.string(),
  audience: z.enum(['speaker', 'sponsor', 'volunteer']),
  /** 触发条件（由后端实现的命名检查） */
  when: z.enum(['photo-missing', 'deck-missing', 'deck-final-missing', 'unconfirmed', 'logo-missing', 'profile-incomplete']),
  /** 相对活动日的天数，如 -25 表示 D-25 当天 10:00 发 */
  days: z.array(z.number().int()),
  subject: z.string(),
});

export const EventConfig = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: LText,
  slogan: LText,
  /** 活动日（当地时间） */
  date: isoDate,
  timezone: z.string().default('Asia/Shanghai'),
  city: LText,
  domain: z.string(),
  contactEmail: z.string().email(),
  registerUrl: z.string().url().nullable().default(null),
  expectedAttendees: z.number().int().positive(),

  theme: z.object({
    /** 站点主题包（apps/web/src/themes/<id>），默认沿用 2026 秋「bridge」 */
    id: z.string().default('bridge'),
    colors: z.object({
      bg: hex, ink: hex, primary: hex, accent: z.array(hex).default([]),
    }),
  }),

  venue: z.object({
    name: z.string(),
    address: z.string(),
    mapUrl: z.string().url().optional(),
    rooms: z.array(Room).default([]),
    boothCount: z.number().int().nonnegative().default(0),
  }),

  tracks: z.array(Track).min(1),
  formats: z.array(Format).default([]),

  deadlines: z.object({
    cfpOpen: isoDate,
    cfpClose: isoDate,
    /** 评审结束、可开始发录用邮件 */
    reviewDone: isoDate,
    speakerConfirm: isoDate,
    agendaFreeze: isoDate,
    deckDraft: isoDate,
    deckFinal: isoDate,
    sponsorMaterials: isoDate,
    /** 志愿者报名截止（缺省 = 活动日前 14 天） */
    volunteerClose: isoDate.optional(),
  }),

  review: z.object({
    reviewers: z.array(z.string()).default([]),
    /** 通过线（总分），低于通过线进入候补池 */
    passScore: z.number().default(10),
    waitlistScore: z.number().default(9),
  }).default({ reviewers: [], passScore: 10, waitlistScore: 9 }),

  sponsors: z.object({ tiers: z.array(SponsorTier).default([]) }).default({ tiers: [] }),

  materials: z.object({ photo: PhotoSpec.default(PhotoSpec.parse({})), deck: DeckSpec.default(DeckSpec.parse({})) }),

  mail: z.object({
    from: z.string(),
    /** 测试期全部外发改投到这个地址（生产必须为空） */
    testTo: z.string().default(''),
  }),

  reminders: z.array(Reminder).default([]),

  /** 组委会内部告警：婉拒、终稿迟交、超时未确认、发信失败等，每天汇总一封（缺省发到 contactEmail） */
  ops: z.object({ alertTo: z.string().email().optional() }).default({}),

  /**
   * 活动结束后（回顾期）。天数均相对活动日。
   * 2026 秋活动后的感谢信、问卷、公开 PPT、赞助回报、个人信息清理全部靠人工记忆。
   */
  post: z.object({
    surveyUrl: z.string().url().nullable().default(null),
    photosUrl: z.string().url().nullable().default(null),
    videoUrl: z.string().url().nullable().default(null),
    /** 讲者提交「公开版」PPT 的截止（D+N） */
    slidesDue: z.number().int().positive().default(7),
    /** 材料页、讲者 / 志愿者链接全部关闭（D+N），之后进入归档期 */
    closeDays: z.number().int().positive().default(30),
    /** 个人信息保留期（D+N）：之后 cdkit archive --purge 清除手机号与未录用者联系方式 */
    retentionDays: z.number().int().positive().default(180),
  }).default({ surveyUrl: null, photosUrl: null, videoUrl: null, slidesDue: 7, closeDays: 30, retentionDays: 180 }),

  feishu: z.object({
    appToken: z.string().default(''),
    tables: z.object({
      cfp: z.string().default(''),
      speakers: z.string().default(''),
      sponsors: z.string().default(''),
      volunteers: z.string().default(''),
      agenda: z.string().default(''),
      todos: z.string().default(''),
      plan: z.string().default(''),
    }).default({ cfp: '', speakers: '', sponsors: '', volunteers: '', agenda: '', todos: '', plan: '' }),
  }),

  ai: z.object({
    enabled: z.boolean().default(true),
    /** Bedrock 区域（Claude 可用区，如 us-west-2 / ap-northeast-1） */
    region: z.string().default('us-west-2'),
    model: z.string().default('anthropic.claude-opus-5-5'),
    /** 便宜、高频任务（逐张照片审核、批量文案）用的模型 */
    fastModel: z.string().default('anthropic.claude-haiku-5-5'),
  }).default({ enabled: true, region: 'us-west-2', model: 'anthropic.claude-opus-5-5', fastModel: 'anthropic.claude-haiku-5-5' }),

  /** 筹备组成员（待办分派、提醒对象） */
  team: z.array(z.object({ name: z.string(), role: z.string().default(''), aliases: z.array(z.string()).default([]) })).default([]),
});
export type EventConfig = z.infer<typeof EventConfig>;

/** 交叉校验：zod 结构合法之外，检查业务上的自洽性。返回问题列表（空 = 通过）。 */
export function lintEvent(ev: EventConfig): string[] {
  const issues: string[] = [];
  const d = ev.deadlines;
  const order: [string, string][] = [
    ['cfpOpen', d.cfpOpen], ['cfpClose', d.cfpClose], ['reviewDone', d.reviewDone], ['speakerConfirm', d.speakerConfirm],
    ['agendaFreeze', d.agendaFreeze], ['deckDraft', d.deckDraft], ['deckFinal', d.deckFinal], ['活动日', ev.date],
  ];
  for (let i = 1; i < order.length; i++) {
    if (order[i][1] < order[i - 1][1]) issues.push(`日期倒挂：${order[i][0]}(${order[i][1]}) 早于 ${order[i - 1][0]}(${order[i - 1][1]})`);
  }
  // 节假日风险：deckFinal 若落在 10/1–10/7，提醒（2026 秋就因国庆把终稿推到 10/9）
  if (/-10-0[1-7]$/.test(d.deckFinal)) issues.push(`deckFinal=${d.deckFinal} 落在国庆假期内，讲者与审核都不在线`);
  const ids = new Set<string>();
  for (const t of ev.tracks) {
    if (ids.has(t.id)) issues.push(`赛道 id 重复：${t.id}`);
    ids.add(t.id);
    if (t.room && !ev.venue.rooms.some((r) => r.id === t.room)) issues.push(`赛道 ${t.id} 的会场 ${t.room} 不在 venue.rooms 中`);
  }
  const totalQuota = ev.tracks.reduce((s, t) => s + t.quota, 0);
  if (totalQuota === 0) issues.push('所有赛道 quota 之和为 0——录用邮件将全部被名额校验拦截');
  const boothTiers = ev.sponsors.tiers.filter((t) => t.booth).length;
  if (boothTiers && ev.venue.boothCount === 0) issues.push('有带展位的赞助档位，但 venue.boothCount = 0');
  if (!ev.materials.photo.guidelines.length) issues.push('materials.photo.guidelines 为空：讲者上传前看不到拍摄要求');
  if (!ev.materials.deck.rules.length) issues.push('materials.deck.rules 为空：PPT 预审没有规则可依');
  if (d.volunteerClose && d.volunteerClose > ev.date) issues.push(`deadlines.volunteerClose(${d.volunteerClose}) 晚于活动日`);
  const p = ev.post;
  if (!(p.slidesDue < p.closeDays && p.closeDays < p.retentionDays)) issues.push('post 天数应满足 slidesDue < closeDays < retentionDays');
  // 录用信发出到活动结束都要能打开材料页：链接令牌最长 120 天
  if (diffDays(addDays(ev.date, p.closeDays), d.reviewDone) > 120) issues.push(`reviewDone(${d.reviewDone}) 到材料页关闭(D+${p.closeDays}) 超过 120 天，录用邮件里的链接会先过期`);
  return issues;
}
