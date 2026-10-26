/**
 * 发信台（Outbox）——所有对外邮件的唯一出口。
 *
 * 2026 秋事故：飞书里把投稿状态改成「通过」，5 分钟定时任务就自动发录用邮件，
 * 评审过程中的中间状态被当成了决定，结果需要 18 位讲者却发出 29 封确认通知。
 *
 * 新流程把「决定」和「发送」拆开，并加三道闸：
 *   1. 计划（plan）：从飞书读出候选人 → 去掉台账里已发过的 → 按赛道名额校验 → 生成批次快照（digest）；
 *   2. 确认（approve）：人在后台看到名单与名额表，输入「本批人数」二次确认；
 *      digest 必须与当前计划一致（计划生成后表格又被改过 → 拒绝，要求重新计划）；
 *      名额超出时必须填写 override 理由并留痕；
 *   3. 发送（send）：每位收件人先在台账里「抢占」幂等键 template:recordId（条件写入），
 *      抢不到即跳过——同一个人同一类邮件这辈子只会发一次，重复点击 / 并发 / 重跑都安全。
 */
import { createHash } from 'node:crypto';
import { checkQuota, diffDays, windows, type EventConfig, type QuotaReport } from '@cdkit/core';

export type TemplateId =
  | 'cfp-accept'
  | 'cfp-waitlist'
  | 'cfp-decline'
  | 'sponsor-accept'
  | 'volunteer-accept'
  | 'thanks-speaker'
  | 'thanks-sponsor'
  | 'thanks-volunteer'
  | `reminder:${string}`;

/** 受名额约束的模板（会占用赛道席位） */
export const QUOTA_BOUND: ReadonlySet<string> = new Set(['cfp-accept']);

/**
 * 互斥模板：收到过 A 的人不能再收到 B。
 * 2026 秋之后的真实风险：已录用 / 已确认的讲者被人在飞书改成「拒绝」或「候补」，下一批拒信 / 候补信就会发给他。
 * 状态可以被误改，台账不会——所以按台账拦截，而不是按飞书当前状态。
 */
export const BLOCKED_BY: Readonly<Record<string, readonly string[]>> = {
  'cfp-decline': ['cfp-accept'],
  'cfp-waitlist': ['cfp-accept', 'cfp-decline'],
  'cfp-accept': ['cfp-decline'],
};

/** 模板可用的时间窗：返回 null 表示可发，否则为原因 */
export function templateWindow(ev: EventConfig, template: string, today: string): string | null {
  const w = windows(ev, today);
  if (template.startsWith('thanks-') && !w.thanks) return `感谢信只能在活动日（${ev.date}）之后发送`;
  if (template.startsWith('reminder:') && !w.reminders) return '活动已开始，不再发送催交提醒';
  if (['cfp-accept', 'cfp-waitlist', 'cfp-decline', 'sponsor-accept', 'volunteer-accept'].includes(template) && today > ev.date) {
    return '活动已结束，不能再发送录用 / 结果类邮件';
  }
  return null;
}

export interface Recipient {
  recordId: string;
  email: string;
  name: string;
  /** 受名额约束时必填 */
  track?: string;
  vars?: Record<string, string>;
}

export interface LedgerEntry {
  key: string;
  template: string;
  recordId: string;
  email: string;
  batchId: string;
  status: 'claimed' | 'sent' | 'failed';
  at: string;
  /** 受名额约束模板记录赛道，名额统计不依赖飞书当前取值 */
  track?: string;
  error?: string;
  /** 超额审批理由 / 审批人，留痕 */
  approvedBy?: string;
  overrideReason?: string;
}

/** 发信台账。生产实现为 DynamoDB（条件写入），测试用内存实现。 */
export interface Ledger {
  /** 原子抢占：键不存在则写入并返回 true；已存在返回 false */
  claim(entry: LedgerEntry): Promise<boolean>;
  update(key: string, patch: Partial<LedgerEntry>): Promise<void>;
  get(key: string): Promise<LedgerEntry | undefined>;
  /** 某模板下所有已抢占 / 已发送记录（名额统计用） */
  listByTemplate(template: string): Promise<LedgerEntry[]>;
  /** 仅用于人工确认「确实没发出去」后释放失败记录 */
  remove(key: string): Promise<void>;
}

export const ledgerKey = (template: string, recordId: string) => `${template}#${recordId}`;

export interface Batch {
  id: string;
  template: TemplateId;
  recipients: Recipient[];
  /** 已在台账中、因此被排除的人数 */
  skippedAlreadySent: number;
  quota: QuotaReport | null;
  /** 因互斥模板被排除的人（例如已发过录用信的人出现在拒信候选里） */
  blocked: { recordId: string; name: string; by: string }[];
  /** 不阻止发送、但审批人应当看到的提示 */
  warnings: string[];
  digest: string;
  createdAt: string;
}

export interface Approval {
  batchId: string;
  digest: string;
  /** 操作者手动输入的人数，必须等于批次人数 */
  confirmCount: number;
  approvedBy: string;
  /** 名额超出时必填 */
  overrideReason?: string;
}

function digestOf(template: string, recipients: Recipient[]): string {
  const canon = recipients
    .map((r) => [r.recordId, r.email.toLowerCase(), r.track ?? ''].join('|'))
    .sort()
    .join('\n');
  return createHash('sha256').update(`${template}\n${canon}`).digest('hex').slice(0, 16);
}

/**
 * 生成发信批次（不发信、无副作用）。
 * committedTracks：受名额约束模板下「台账外」但已确认的记录（例如上一届工具发过、手工发过的），可选。
 */
export async function planBatch(opts: {
  ev: EventConfig;
  template: TemplateId;
  candidates: Recipient[];
  ledger: Ledger;
  extraCommitted?: { track: string }[];
  /** 已发过录用但随后婉拒 / 撤销的 recordId——释放其名额，用于候补递补 */
  freed?: Iterable<string>;
  now?: Date;
}): Promise<Batch> {
  const { ev, template, ledger } = opts;
  // 1) 基础清洗：邮箱合法、同一 recordId 去重、同一邮箱同模板去重
  const seenRecord = new Set<string>();
  const seenEmail = new Set<string>();
  const clean: Recipient[] = [];
  for (const r of opts.candidates) {
    const email = r.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !r.recordId) continue;
    if (seenRecord.has(r.recordId) || seenEmail.has(email)) continue;
    seenRecord.add(r.recordId);
    seenEmail.add(email);
    clean.push({ ...r, email });
  }
  // 2) 排除台账中已存在的
  const sent = await ledger.listByTemplate(template);
  const sentIds = new Set(sent.map((e) => e.recordId));
  const notYet = clean.filter((r) => !sentIds.has(r.recordId));
  // 2b) 互斥模板
  const blocked: Batch['blocked'] = [];
  const blockers = new Map<string, string>();
  for (const other of BLOCKED_BY[template] ?? []) {
    for (const e of await ledger.listByTemplate(other)) if (e.status !== 'failed') blockers.set(e.recordId, other);
  }
  const recipients = notYet.filter((r) => {
    const by = blockers.get(r.recordId);
    if (by) blocked.push({ recordId: r.recordId, name: r.name, by });
    return !by;
  });
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: ev.timezone }).format(opts.now ?? new Date());
  const closed = templateWindow(ev, template, today);
  if (closed) throw new ApprovalError(closed);
  const warnings: string[] = [];
  if (template === 'cfp-accept' && today <= ev.deadlines.cfpClose) warnings.push(`征稿尚未截止（${ev.deadlines.cfpClose}），提前录用会挤占后续投稿的名额`);
  if (template === 'cfp-accept' && today > ev.deadlines.speakerConfirm) {
    warnings.push(`已过讲者确认截止（${ev.deadlines.speakerConfirm}），本批讲者的准备时间只有 ${diffDays(ev.date, today)} 天`);
  }
  if (blocked.length) warnings.push(`${blocked.length} 人因已收到 ${[...new Set(blocked.map((b) => b.by))].join(' / ')} 被排除，请检查飞书状态是否被误改`);
  // 3) 名额
  let quota: QuotaReport | null = null;
  if (QUOTA_BOUND.has(template)) {
    const freed = new Set(opts.freed ?? []);
    const committed = sent
      .filter((e) => e.status !== 'failed' && !freed.has(e.recordId))
      .map((e) => ({ track: e.track ?? '?' }));
    quota = checkQuota(ev, [...committed, ...(opts.extraCommitted ?? [])], recipients.map((r) => ({ track: r.track ?? '' })));
  }
  const digest = digestOf(template, recipients);
  const createdAt = (opts.now ?? new Date()).toISOString();
  return {
    id: `${template}-${createdAt.replace(/[-:.TZ]/g, '').slice(0, 14)}-${digest.slice(0, 6)}`,
    template,
    recipients,
    skippedAlreadySent: clean.length - notYet.length,
    quota,
    blocked,
    warnings,
    digest,
    createdAt,
  };
}

export class ApprovalError extends Error {}

/** 校验审批，不通过抛 ApprovalError（文案直接展示给操作者） */
export function verifyApproval(batch: Batch, a: Approval): void {
  if (a.batchId !== batch.id || a.digest !== batch.digest) {
    throw new ApprovalError('批次已过期：生成计划后名单发生了变化，请重新生成并核对');
  }
  if (a.confirmCount !== batch.recipients.length) {
    throw new ApprovalError(`确认人数不符：本批 ${batch.recipients.length} 人，你输入的是 ${a.confirmCount}`);
  }
  if (!a.approvedBy) throw new ApprovalError('缺少审批人');
  if (batch.quota && !batch.quota.ok && !a.overrideReason?.trim()) {
    throw new ApprovalError('本批超出赛道名额，必须填写超额理由（将记录在台账中）');
  }
}

export interface SendResult {
  batchId: string;
  sent: string[];
  skipped: string[];
  failed: { recordId: string; error: string }[];
}

/**
 * 执行已审批的批次。send 回调负责真正投递（邮件 API / SES），
 * onSent 回调负责回写飞书状态（如 通过 → 已通知）。
 */
export async function sendBatch(opts: {
  batch: Batch;
  approval: Approval;
  ledger: Ledger;
  send: (r: Recipient, template: TemplateId) => Promise<void>;
  onSent?: (r: Recipient) => Promise<void>;
  /** 测试期改投地址：非空时不会写入「sent」以外的任何真实状态 */
  testTo?: string;
  now?: () => Date;
  throttleMs?: number;
}): Promise<SendResult> {
  verifyApproval(opts.batch, opts.approval);
  const now = opts.now ?? (() => new Date());
  const res: SendResult = { batchId: opts.batch.id, sent: [], skipped: [], failed: [] };
  for (const r of opts.batch.recipients) {
    const key = ledgerKey(opts.batch.template, r.recordId);
    const claimed = await opts.ledger.claim({
      key,
      template: opts.batch.template,
      recordId: r.recordId,
      email: r.email,
      batchId: opts.batch.id,
      status: 'claimed',
      at: now().toISOString(),
      track: r.track,
      approvedBy: opts.approval.approvedBy,
      overrideReason: opts.approval.overrideReason,
    });
    if (!claimed) {
      res.skipped.push(r.recordId);
      continue;
    }
    try {
      await opts.send(opts.testTo ? { ...r, email: opts.testTo } : r, opts.batch.template);
      await opts.ledger.update(key, { status: 'sent', at: now().toISOString() });
      if (!opts.testTo) await opts.onSent?.(r);
      res.sent.push(r.recordId);
    } catch (err) {
      // 不自动释放抢占：投递结果不确定时宁可漏发（人工补发）也不重复发
      const error = String((err as Error)?.message ?? err);
      await opts.ledger.update(key, { status: 'failed', error });
      res.failed.push({ recordId: r.recordId, error });
    }
    if (opts.throttleMs) await new Promise((ok) => setTimeout(ok, opts.throttleMs));
  }
  return res;
}

/** 抢占后超过这个时间仍是 claimed：发送过程被中断（Lambda 超时 / 崩溃），投递结果未知 */
export const STALE_CLAIM_MS = 15 * 60 * 1000;

/** failed，或卡在 claimed 超过 STALE_CLAIM_MS 的记录——都需要人确认是否送达 */
export function needsAttention(e: LedgerEntry, now = Date.now()): boolean {
  return e.status === 'failed' || (e.status === 'claimed' && now - Date.parse(e.at) > STALE_CLAIM_MS);
}

/**
 * 人工补发：确认某条记录确实没有送达后，释放台账记录，下次计划会重新纳入。
 * 只能释放 failed 或卡住的 claimed，已发送的记录永远不能释放。
 */
export async function releaseFailed(ledger: Ledger, template: string, recordId: string, now = Date.now()): Promise<boolean> {
  const e = await ledger.get(ledgerKey(template, recordId));
  if (!e || !needsAttention(e, now)) return false;
  await ledger.remove(e.key);
  return true;
}

export class MemoryLedger implements Ledger {
  rows = new Map<string, LedgerEntry>();
  async claim(e: LedgerEntry) {
    if (this.rows.has(e.key)) return false;
    this.rows.set(e.key, { ...e });
    return true;
  }
  async update(key: string, patch: Partial<LedgerEntry>) {
    const cur = this.rows.get(key);
    if (cur) this.rows.set(key, { ...cur, ...patch });
  }
  async get(key: string) {
    return this.rows.get(key);
  }
  async listByTemplate(template: string) {
    return [...this.rows.values()].filter((r) => r.template === template);
  }
  async remove(key: string) {
    this.rows.delete(key);
  }
}
