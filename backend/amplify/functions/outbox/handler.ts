/**
 * 发信台 Lambda（由 admin-api invoke，或每日定时触发）。所有对外邮件都从这里出。
 *
 *   { action: 'plan', template }                       → 生成批次快照（不发信），返回名单 + 名额表
 *   { action: 'send', batchId, digest, confirmCount, approvedBy, overrideReason? } → 审批并发送
 *   { action: 'release', template, recordId }          → 人工确认未送达后释放失败记录
 *   EventBridge 定时（每天 10:00）                       → 催交提醒（不占名额、按天幂等，自动发送）
 *
 * 与 2026 秋的关键区别：没有任何「飞书状态 = 通过 → 定时自动发录用邮件」的路径。
 */
import { asText, type FeishuRecord } from '@cdkit/feishu';
import {
  planBatch, sendBatch, verifyApproval, releaseFailed, render, dueReminders, speakerMissing,
  ApprovalError, type Approval, type Recipient, type Subject, type TemplateId,
} from '@cdkit/outbox';
import { ev } from '../_shared/event.ts';
import { feishu, sendMail } from '../_shared/io.ts';
import { signToken } from '../_shared/token.ts';
import { DynamoLedger } from './ledger.ts';

const { OUTBOX_TABLE = '', CONFIRM_SECRET = '', PORTAL_URL = '', TEST_TO = '' } = process.env;
const ledger = new DynamoLedger(OUTBOX_TABLE);
const T = ev.feishu.tables;
const APP = ev.feishu.appToken;

interface Source {
  table: string;
  status: string;
  /** 发送成功后回写的状态；undefined = 不改状态（只记台账） */
  writeBack?: string;
  portal?: (recordId: string) => string;
}

const speakerPortal = (id: string) => `${PORTAL_URL}?k=speaker&t=${encodeURIComponent(signToken(id, CONFIRM_SECRET, 'speaker'))}`;
const sponsorPortal = (id: string) => `${PORTAL_URL}?k=sponsor&t=${encodeURIComponent(signToken(id, CONFIRM_SECRET, 'sponsor'))}`;
// 志愿者指引页沿用官网 /volunteer/portal（admin-api 验签，无 purpose，兼容旧格式）
const volunteerPortal = (id: string) => `https://${ev.domain}/volunteer/portal?token=${encodeURIComponent(signToken(id, CONFIRM_SECRET))}`;

const SOURCES: Record<string, Source> = {
  'cfp-accept': { table: T.cfp, status: '通过', writeBack: '已通知', portal: speakerPortal },
  'cfp-waitlist': { table: T.cfp, status: '候补' },
  'cfp-decline': { table: T.cfp, status: '拒绝' },
  'volunteer-accept': { table: T.volunteers, status: '通过', writeBack: '已通知', portal: volunteerPortal },
  'sponsor-accept': { table: T.sponsors, status: '通过', writeBack: '已通知', portal: sponsorPortal },
};

const f = (r: FeishuRecord, k: string) => asText(r.fields[k]);

function toRecipient(template: string, r: FeishuRecord, src: Source): Recipient {
  return {
    recordId: r.record_id,
    email: f(r, '邮箱'),
    name: f(r, '姓名') || f(r, '联系人') || f(r, '公司'),
    track: template === 'cfp-accept' ? f(r, '赛道') : undefined,
    vars: {
      talk: f(r, '议题'),
      role: f(r, '分配岗位') || f(r, '意向岗位'),
      ...(src.portal ? { portalUrl: src.portal(r.record_id) } : {}),
    },
  };
}

async function plan(template: TemplateId) {
  const src = SOURCES[template];
  if (!src) throw new ApprovalError(`不支持的模板：${template}`);
  const rows = await feishu.listRecords(APP, src.table);
  const candidates = rows.filter((r) => f(r, '状态') === src.status).map((r) => toRecipient(template, r, src));
  // 台账之外已占名额的（例如工具上线前手工发出的）也要计入
  let extraCommitted: { track: string }[] = [];
  let freed: string[] = [];
  if (template === 'cfp-accept') {
    const inLedger = new Set((await ledger.listByTemplate(template)).map((e) => e.recordId));
    extraCommitted = rows.filter((r) => ['已通知', '已确认'].includes(f(r, '状态')) && !inLedger.has(r.record_id)).map((r) => ({ track: f(r, '赛道') }));
    // 婉拒 / 撤销的讲者释放名额
    freed = rows.filter((r) => ['已婉拒', '已撤销'].includes(f(r, '状态'))).map((r) => r.record_id);
  }
  const batch = await planBatch({ ev, template, candidates, ledger, extraCommitted, freed });
  await ledger.saveBatch(batch);
  // 返回给后台的版本不带 portal 链接（链接即凭证）
  return { ...batch, recipients: batch.recipients.map(({ vars, ...r }) => ({ ...r, talk: vars?.talk ?? '' })), preview: batch.recipients[0] ? render(ev, template, batch.recipients[0]) : null };
}

async function send(a: Approval) {
  const batch = await ledger.loadBatch(a.batchId);
  if (!batch) throw new ApprovalError('批次不存在或已过期（2 天），请重新生成');
  verifyApproval(batch, a);
  const src = SOURCES[batch.template];
  return sendBatch({
    batch,
    approval: a,
    ledger,
    testTo: TEST_TO,
    throttleMs: 150,
    send: async (r, template) => {
      const m = render(ev, template, r);
      await sendMail({ from: ev.mail.from, to: r.email, subject: TEST_TO ? `[TEST] ${m.subject}` : m.subject, text: m.text, html: m.html });
    },
    onSent: src?.writeBack ? (r) => feishu.updateRecord(APP, src.table, r.recordId, { 状态: src.writeBack }).then(() => undefined) : undefined,
  });
}

function todayLocal(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ev.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

async function reminders() {
  const today = todayLocal();
  const subjects: Subject[] = [];
  if (ev.reminders.some((r) => r.audience === 'speaker')) {
    for (const r of await feishu.listRecords(APP, T.cfp)) {
      const status = f(r, '状态');
      if (!['已通知', '已确认'].includes(status)) continue;
      subjects.push({
        ...toRecipient('reminder', r, SOURCES['cfp-accept']),
        audience: 'speaker',
        missing: speakerMissing({ status, photo: f(r, '照片'), deck: f(r, 'PPT 初稿'), deckFinal: f(r, 'PPT 终稿') }),
      });
    }
  }
  if (ev.reminders.some((r) => r.audience === 'sponsor') && T.sponsors) {
    for (const r of await feishu.listRecords(APP, T.sponsors)) {
      if (!['已通知', '已确认'].includes(f(r, '状态')) || f(r, 'Logo')) continue;
      subjects.push({ ...toRecipient('reminder', r, SOURCES['sponsor-accept']), audience: 'sponsor', missing: ['logo-missing'] });
    }
  }
  const results = [];
  for (const due of dueReminders(ev, today, subjects)) {
    const batch = await planBatch({ ev, template: due.template, candidates: due.recipients, ledger });
    if (!batch.recipients.length) continue;
    // 提醒类：系统自动审批（不占名额、台账按天去重）
    const approval: Approval = { batchId: batch.id, digest: batch.digest, confirmCount: batch.recipients.length, approvedBy: 'system:reminder' };
    results.push(
      await sendBatch({
        batch, approval, ledger, testTo: TEST_TO, throttleMs: 150,
        send: async (r, template) => {
          const m = render(ev, template, r);
          await sendMail({ from: ev.mail.from, to: r.email, subject: m.subject, text: m.text, html: m.html });
        },
      }),
    );
  }
  return { today, results };
}

export async function handler(event: Record<string, unknown>) {
  try {
    if (event.source === 'aws.events' || event['detail-type'] === 'Scheduled Event') return { ok: true, ...(await reminders()) };
    switch (event.action) {
      case 'plan':
        return { ok: true, batch: await plan(String(event.template) as TemplateId) };
      case 'send':
        return { ok: true, result: await send(event as unknown as Approval) };
      case 'release':
        return { ok: await releaseFailed(ledger, String(event.template), String(event.recordId)) };
      case 'reminders':
        return { ok: true, ...(await reminders()) };
      default:
        return { ok: false, error: `unknown action ${String(event.action)}` };
    }
  } catch (err) {
    if (err instanceof ApprovalError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: 'internal error' };
  }
}
