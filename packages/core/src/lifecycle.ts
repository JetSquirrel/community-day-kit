/**
 * 活动生命周期：整届活动的阶段（按日期推出）+ 投稿 / 赞助 / 志愿者三张表的状态机 + 「卡住」巡检。
 *
 * 2026 秋的状态问题大多不是「状态不够」，而是：
 *   - 谁都能把任意状态改成任意状态（已确认的讲者被改回「拒绝」，下一批拒信就会发给他）；
 *   - 有些状态没人推进（已通知但一直不确认、志愿者永远到不了「已确认」）；
 *   - 有些开关写死在代码里（CFP_CLOSED = true），换一届不改就关着。
 * 这里把合法流转写成表：后台改状态、发信台、材料页都按同一张表校验；
 * audit() 每天跑一次，把超时、漏发、名额空出、官网展示不一致等列给组委会。
 */
import type { EventConfig } from './schema.ts';
import { addDays, diffDays } from './dates.ts';

// ——— 活动阶段 ———

export const PHASES = ['setup', 'cfp', 'review', 'confirm', 'prep', 'live', 'wrapup', 'archive', 'purge'] as const;
export type Phase = (typeof PHASES)[number];

export const PHASE_LABEL: Record<Phase, string> = {
  setup: '筹备期（征稿未开）',
  cfp: '征稿期',
  review: '评审期',
  confirm: '讲者确认期',
  prep: '材料与冲刺期',
  live: '活动日',
  wrapup: '回顾期',
  archive: '归档期（链接已关闭）',
  purge: '超过个人信息保留期',
};

export function phaseOf(ev: EventConfig, today: string): Phase {
  const d = ev.deadlines;
  if (today < d.cfpOpen) return 'setup';
  if (today <= d.cfpClose) return 'cfp';
  if (today <= d.reviewDone) return 'review';
  if (today <= d.speakerConfirm) return 'confirm';
  if (today < ev.date) return 'prep';
  if (today === ev.date) return 'live';
  if (today <= addDays(ev.date, ev.post.closeDays)) return 'wrapup';
  if (today <= addDays(ev.date, ev.post.retentionDays)) return 'archive';
  return 'purge';
}

/** 各入口在 today 是否开放——官网、admin-api、材料页、发信台共用，不再各写一个布尔常量 */
export function windows(ev: EventConfig, today: string) {
  const d = ev.deadlines;
  const volunteerClose = d.volunteerClose ?? addDays(ev.date, -14);
  return {
    cfpSubmit: today >= d.cfpOpen && today <= d.cfpClose,
    sponsorApply: today <= d.sponsorMaterials,
    volunteerApply: today <= volunteerClose,
    volunteerClose,
    /** 讲者 / 赞助商提交照片、PPT、Logo */
    materials: today <= ev.date,
    /** 终稿截止后仍可替换，但标为迟交并通知组委会（现场投屏要同步更新） */
    deckLate: today > d.deckFinal && today <= ev.date,
    /** 活动后：讲者提交可公开版 PPT + 公开授权 */
    publicSlides: today > ev.date && today <= addDays(ev.date, ev.post.closeDays),
    publicSlidesDue: addDays(ev.date, ev.post.slidesDue),
    /** 材料页 / 志愿者指引页链接整体失效的日期（含当天仍可用） */
    linksUntil: addDays(ev.date, ev.post.closeDays),
    /** 催交提醒只在活动日之前发 */
    reminders: today < ev.date,
    /** 感谢信、问卷只能在活动结束后发 */
    thanks: today > ev.date,
  };
}

// ——— 状态机 ———

export type Machine = 'cfp' | 'sponsor' | 'volunteer';
/** reviewer = 后台评审 / 组委会手动；outbox = 发信台发送成功后；self = 本人在材料页 / 指引页；organizer = 组委会带理由的强制操作 */
export type Actor = 'reviewer' | 'outbox' | 'self' | 'organizer';

export interface Transition {
  from: string[];
  to: string;
  by: Actor;
  note: string;
}

export interface MachineDef {
  states: string[];
  initial: string;
  /** 进入后不再变化的状态 */
  terminal: string[];
  /** 发过录用类邮件后才会到达的状态——不能再被评审操作改回去 */
  locked: string[];
  transitions: Transition[];
}

const REVIEW = ['待审核', '通过', '候补', '拒绝'];

export const MACHINES: Record<Machine, MachineDef> = {
  cfp: {
    states: ['待审核', '通过', '候补', '拒绝', '已通知', '已确认', '已婉拒', '已撤销'],
    initial: '待审核',
    terminal: ['已婉拒', '已撤销'],
    locked: ['已通知', '已确认', '已婉拒', '已撤销'],
    transitions: [
      { from: REVIEW, to: '通过', by: 'reviewer', note: '评审决定，不发信' },
      { from: REVIEW, to: '候补', by: 'reviewer', note: '评审决定 / 名额已满' },
      { from: REVIEW, to: '拒绝', by: 'reviewer', note: '评审决定，不发信' },
      { from: REVIEW, to: '待审核', by: 'reviewer', note: '撤回评审决定' },
      { from: ['通过'], to: '已通知', by: 'outbox', note: '发信台 cfp-accept 发送成功' },
      { from: ['已通知'], to: '已确认', by: 'self', note: '材料页提交（含照片）即确认出席' },
      { from: ['已通知', '已确认'], to: '已婉拒', by: 'self', note: '材料页「无法出席」，释放名额' },
      { from: ['通过', '已通知', '已确认'], to: '已撤销', by: 'organizer', note: '组委会撤销（须填理由），释放名额、链接失效' },
    ],
  },
  sponsor: {
    states: ['待审核', '通过', '拒绝', '已通知', '已确认', '已婉拒', '已撤销'],
    initial: '待审核',
    terminal: ['已婉拒', '已撤销'],
    locked: ['已通知', '已确认', '已婉拒', '已撤销'],
    transitions: [
      { from: ['待审核', '通过', '拒绝'], to: '通过', by: 'reviewer', note: '合作确认（合同 / 置换达成）' },
      { from: ['待审核', '通过', '拒绝'], to: '拒绝', by: 'reviewer', note: '' },
      { from: ['通过', '拒绝'], to: '待审核', by: 'reviewer', note: '撤回决定' },
      { from: ['通过'], to: '已通知', by: 'outbox', note: '发信台 sponsor-accept 发送成功' },
      { from: ['通过', '已通知'], to: '已确认', by: 'self', note: '材料页提交 Logo' },
      { from: ['通过', '已通知', '已确认'], to: '已婉拒', by: 'organizer', note: '对方退出（须填理由）' },
      { from: ['通过', '已通知', '已确认'], to: '已撤销', by: 'organizer', note: '组委会终止合作（须填理由）' },
    ],
  },
  volunteer: {
    states: ['待审核', '通过', '拒绝', '已通知', '已确认', '已婉拒', '已撤销'],
    initial: '待审核',
    terminal: ['已婉拒', '已撤销'],
    locked: ['已通知', '已确认', '已婉拒', '已撤销'],
    transitions: [
      { from: ['待审核', '通过', '拒绝'], to: '通过', by: 'reviewer', note: '' },
      { from: ['待审核', '通过', '拒绝'], to: '拒绝', by: 'reviewer', note: '' },
      { from: ['通过', '拒绝'], to: '待审核', by: 'reviewer', note: '撤回决定' },
      { from: ['通过'], to: '已通知', by: 'outbox', note: '发信台 volunteer-accept 发送成功' },
      { from: ['已通知'], to: '已确认', by: 'self', note: '指引页「确认参加」' },
      { from: ['已通知', '已确认'], to: '已婉拒', by: 'self', note: '指引页「无法参加」' },
      { from: ['通过', '已通知', '已确认'], to: '已撤销', by: 'organizer', note: '组委会撤销（须填理由）' },
    ],
  },
};

/** 空状态视为初始状态（飞书新行常常没有选状态） */
const norm = (m: MachineDef, s: string) => s || m.initial;

/** 合法返回 null，否则返回给操作者看的原因 */
export function checkTransition(machine: Machine, from: string, to: string, by: Actor): string | null {
  const m = MACHINES[machine];
  const f = norm(m, from);
  if (!m.states.includes(to)) return `未知状态「${to}」`;
  if (f === to) return null;
  const ok = m.transitions.some((t) => t.to === to && t.by === by && t.from.includes(f));
  if (ok) return null;
  const via = m.transitions.filter((t) => t.to === to && t.from.includes(f)).map((t) => t.by);
  if (via.length) return `「${f} → ${to}」只能由 ${via.map((v) => ACTOR_LABEL[v]).join(' / ')} 完成`;
  if (m.locked.includes(f)) return `已到「${f}」（邮件已发出或本人已操作），评审状态不能再改；如需取消请用「撤销」并填写理由`;
  return `不允许「${f} → ${to}」`;
}

export const ACTOR_LABEL: Record<Actor, string> = { reviewer: '后台评审', outbox: '发信台', self: '本人（材料页 / 指引页）', organizer: '组委会撤销操作' };

// ——— 巡检 ———

export interface AuditRow {
  id: string;
  name: string;
  status: string;
  track?: string;
  photo?: boolean;
  deck?: boolean;
  deckFinal?: boolean;
  /** 活动后：是否已给出公开授权（公开 / 不公开均算） */
  publicDecision?: boolean;
  logo?: boolean;
}

export interface AuditInput {
  cfp: AuditRow[];
  sponsors: AuditRow[];
  volunteers: AuditRow[];
  /** 嘉宾表中勾选了「展示」的讲者 ID（= 投稿 recordId） */
  shownSpeakerIds?: string[];
  /** 已在台账中发出的模板 → recordId 集合（Lambda 侧可提供；CLI 侧缺省） */
  sent?: Record<string, Set<string>>;
}

export interface Issue {
  level: 'act' | 'warn' | 'info';
  area: '投稿' | '讲者' | '赞助' | '志愿者' | '官网' | '回顾' | '数据';
  message: string;
  who?: string[];
}

export function audit(ev: EventConfig, today: string, input: AuditInput): Issue[] {
  const d = ev.deadlines;
  const w = windows(ev, today);
  const out: Issue[] = [];
  const names = (rows: AuditRow[]) => rows.map((r) => r.name || r.id);
  const push = (level: Issue['level'], area: Issue['area'], rows: AuditRow[], message: string) => {
    if (rows.length) out.push({ level, area, message: message.replace('{n}', String(rows.length)), who: names(rows) });
  };
  const by = (rows: AuditRow[], ...s: string[]) => rows.filter((r) => s.includes(r.status || '待审核'));

  // 非法状态（飞书里手打 / 改了选项名）
  for (const [machine, rows, area] of [['cfp', input.cfp, '投稿'], ['sponsor', input.sponsors, '赞助'], ['volunteer', input.volunteers, '志愿者']] as const) {
    const bad = rows.filter((r) => r.status && !MACHINES[machine].states.includes(r.status));
    push('warn', area, bad, `{n} 条记录状态不在状态机内（${[...new Set(bad.map((r) => r.status))].join('、')}），发信台与提醒都会忽略它们`);
  }

  // —— 投稿 / 讲者 ——
  const cfp = input.cfp;
  if (today > d.reviewDone) {
    push('act', '投稿', by(cfp, '待审核'), `评审已于 ${d.reviewDone} 截止，仍有 {n} 条待审核`);
    push(diffDays(today, d.reviewDone) > 2 ? 'act' : 'warn', '投稿', by(cfp, '通过'), '{n} 位已评为「通过」但还没发录用信（发信台生成批次）');
  }
  if (today > d.speakerConfirm && today <= ev.date) {
    push('act', '讲者', by(cfp, '已通知'), `{n} 位超过确认截止（${d.speakerConfirm}）仍未确认：延期，或「撤销」后递补候补`);
  }
  if (today <= ev.date) {
    const hold = by(cfp, '已通知', '已确认');
    for (const t of ev.tracks) {
      const held = hold.filter((r) => r.track === t.id).length;
      const wait = by(cfp, '候补').filter((r) => r.track === t.id);
      if (held > t.quota) out.push({ level: 'warn', area: '讲者', message: `赛道 ${t.id} 已占 ${held} 席，超过 quota ${t.quota}` });
      else if (held < t.quota && wait.length && today > d.reviewDone) {
        out.push({ level: 'act', area: '讲者', message: `赛道 ${t.id} 空出 ${t.quota - held} 席，有 ${wait.length} 位候补可递补（改为「通过」后在发信台发录用信）`, who: names(wait) });
      }
    }
    const confirmed = by(cfp, '已确认');
    if (today > d.deckDraft) push('act', '讲者', confirmed.filter((r) => !r.deck && !r.deckFinal), `{n} 位已过初稿截止（${d.deckDraft}）仍未交 PPT`);
    if (today > d.deckFinal) push('act', '讲者', confirmed.filter((r) => !r.deckFinal), `{n} 位已过终稿截止（${d.deckFinal}）仍未交终稿，现场投屏需准备兜底`);
  }
  if (input.shownSpeakerIds) {
    const shown = new Set(input.shownSpeakerIds);
    push('act', '官网', cfp.filter((r) => ['已婉拒', '已撤销', '拒绝', '候补'].includes(r.status) && shown.has(r.id)), '{n} 位讲者不会出席，但嘉宾表仍勾选「展示」');
    if (today >= d.agendaFreeze) push('info', '官网', by(cfp, '已确认').filter((r) => !shown.has(r.id)), '{n} 位已确认讲者尚未在官网展示');
  }

  // —— 赞助 ——
  if (today > d.sponsorMaterials && today <= ev.date) {
    push('act', '赞助', by(input.sponsors, '通过', '已通知').filter((r) => !r.logo), `{n} 家已过材料截止（${d.sponsorMaterials}）仍无高清 Logo`);
  }
  if (today <= ev.date) push('warn', '赞助', by(input.sponsors, '通过'), '{n} 家已确认合作但还没发 Logo 收集邮件');

  // —— 志愿者 ——
  if (today > w.volunteerClose && today <= ev.date) {
    push('act', '志愿者', by(input.volunteers, '待审核'), `报名已于 ${w.volunteerClose} 截止，仍有 {n} 位待审核`);
    push('act', '志愿者', by(input.volunteers, '通过'), '{n} 位已通过但还没发录取信');
  }
  if (today >= addDays(ev.date, -3) && today <= ev.date) push('warn', '志愿者', by(input.volunteers, '已通知'), '{n} 位志愿者还没在指引页确认参加');

  // —— 回顾 ——
  if (w.thanks) {
    const sent = input.sent;
    if (sent && diffDays(today, ev.date) >= 3) {
      for (const [tpl, rows, area] of [['thanks-speaker', by(cfp, '已确认'), '讲者'], ['thanks-sponsor', by(input.sponsors, '已确认'), '赞助'], ['thanks-volunteer', by(input.volunteers, '已通知', '已确认'), '志愿者']] as const) {
        const done = sent[tpl] ?? new Set<string>();
        push('act', '回顾', rows.filter((r) => !done.has(r.id)), `{n} 位${area}还没收到感谢信（发信台 ${tpl}）`);
      }
    }
    if (today > w.publicSlidesDue && today <= w.linksUntil) {
      push('info', '回顾', by(cfp, '已确认').filter((r) => !r.publicDecision), `{n} 位讲者在 ${w.publicSlidesDue} 前未给出 PPT 公开授权（默认不公开）`);
    }
    if (!ev.post.surveyUrl && diffDays(today, ev.date) <= ev.post.slidesDue) out.push({ level: 'warn', area: '回顾', message: 'post.surveyUrl 为空：感谢信和官网回顾页都不会附问卷' });
  }
  const purgeOn = addDays(ev.date, ev.post.retentionDays);
  if (today > purgeOn) out.push({ level: 'act', area: '数据', message: `已超过个人信息保留期（${purgeOn}）：运行 cdkit archive ${ev.slug} --purge --apply` });

  const rank = { act: 0, warn: 1, info: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

export function formatIssues(issues: Issue[]): string {
  if (!issues.length) return '✓ 没有卡住的事项';
  const icon = { act: '🔴', warn: '🟡', info: '⚪' };
  return issues
    .map((i) => `${icon[i.level]} [${i.area}] ${i.message}${i.who?.length ? `\n     ${i.who.slice(0, 12).join('、')}${i.who.length > 12 ? ` 等 ${i.who.length} 人` : ''}` : ''}`)
    .join('\n');
}
