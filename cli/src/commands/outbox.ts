/**
 * cdkit outbox:preview <slug> [--template cfp-accept]
 * 只读预演：按飞书当前状态算出「如果现在发录用邮件，会发给谁、名额是否超出」。
 * 真正发信在后台发信台完成（需要二次确认 + DynamoDB 台账）；这个命令给评审会上快速核对用。
 */
import { formatQuota } from '@cdkit/core';
import { asText } from '@cdkit/feishu';
import { MemoryLedger, planBatch, type TemplateId } from '@cdkit/outbox';
import { event, feishu, log } from '../ctx.ts';

const STATUS_FOR: Partial<Record<string, string>> = { 'cfp-accept': '通过', 'cfp-waitlist': '候补', 'cfp-decline': '拒绝' };

export async function run(args: string[], flags: Record<string, string | boolean>) {
  const ev = event(args[0]);
  const template = String(flags.template ?? 'cfp-accept') as TemplateId;
  const status = STATUS_FOR[template];
  if (!status) throw new Error(`预演仅支持 ${Object.keys(STATUS_FOR).join(' / ')}`);
  const rows = await feishu().listRecords(ev.feishu.appToken, ev.feishu.tables.cfp);
  const pick = (s: string[]) => rows.filter((r) => s.includes(asText(r.fields['状态'])));
  const candidates = pick([status]).map((r) => ({
    recordId: r.record_id,
    email: asText(r.fields['邮箱']),
    name: asText(r.fields['姓名']),
    track: asText(r.fields['赛道']),
    vars: { talk: asText(r.fields['议题']) },
  }));
  // 已通知 / 已确认 视为已占名额（无论是谁、用什么方式发出的）
  const committed = pick(['已通知', '已确认']).map((r) => ({ track: asText(r.fields['赛道']) }));
  const batch = await planBatch({ ev, template, candidates, ledger: new MemoryLedger(), extraCommitted: template === 'cfp-accept' ? committed : [] });
  log(`模板 ${template}：本批 ${batch.recipients.length} 人（digest ${batch.digest}）`);
  for (const r of batch.recipients) log(`  - [${r.track}] ${r.name} <${r.email}> 《${r.vars?.talk}》`);
  if (batch.quota) {
    log(`\n${formatQuota(batch.quota)}`);
    log(batch.quota.ok ? '\n✓ 名额内，可在后台发信台审批发送' : '\n✗ 超出名额：请先在飞书把多出的改为「候补」，或在后台填写超额理由');
  }
}
