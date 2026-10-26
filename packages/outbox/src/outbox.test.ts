import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEvent } from '@cdkit/core';
import { MemoryLedger, planBatch, sendBatch, verifyApproval, ApprovalError, releaseFailed, render, dueReminders, speakerMissing, type Recipient } from './index.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ev = loadEvent(path.join(root, 'events/2026-autumn-shenzhen'));

/** 固定在评审结束后、活动日前（不随运行日期变化） */
const NOW = new Date('2026-09-05T02:00:00Z');
const plan = (o: Omit<Parameters<typeof planBatch>[0], 'now'>, now = NOW) => planBatch({ ...o, now });

const people = (n: number, track: string, from = 0): Recipient[] =>
  Array.from({ length: n }, (_, i) => ({ recordId: `rec${track}${i + from}`, email: `${track}${i + from}@x.com`, name: `讲者${i + from}`, track, vars: { talk: '议题' } }));

const approve = (b: Awaited<ReturnType<typeof plan>>, extra: object = {}) => ({ batchId: b.id, digest: b.digest, confirmCount: b.recipients.length, approvedBy: 'tester', ...extra });

test('计划不发信；名额内批次审批后发出，台账记录', async () => {
  const ledger = new MemoryLedger();
  const b = await plan({ ev, template: 'cfp-accept', candidates: people(5, 'ai'), ledger });
  assert.equal(ledger.rows.size, 0, 'plan 无副作用');
  assert.equal(b.quota?.ok, true);
  const outbox: string[] = [];
  const r = await sendBatch({ batch: b, approval: approve(b), ledger, send: async (x) => void outbox.push(x.email) });
  assert.equal(r.sent.length, 5);
  assert.equal(outbox.length, 5);
});

test('同一人永不重复发：重复执行 / 重新计划都会跳过', async () => {
  const ledger = new MemoryLedger();
  const b = await plan({ ev, template: 'cfp-accept', candidates: people(3, 'ai'), ledger });
  let n = 0;
  await sendBatch({ batch: b, approval: approve(b), ledger, send: async () => void n++ });
  const again = await sendBatch({ batch: b, approval: approve(b), ledger, send: async () => void n++ });
  assert.equal(n, 3);
  assert.equal(again.skipped.length, 3);
  const re = await plan({ ev, template: 'cfp-accept', candidates: people(3, 'ai'), ledger });
  assert.equal(re.recipients.length, 0);
  assert.equal(re.skippedAlreadySent, 3);
});

test('超额：已发 + 本批 > 名额 → 无理由不能审批', async () => {
  const ledger = new MemoryLedger();
  const first = await plan({ ev, template: 'cfp-accept', candidates: people(6, 'ai'), ledger });
  await sendBatch({ batch: first, approval: approve(first), ledger, send: async () => {} });
  const second = await plan({ ev, template: 'cfp-accept', candidates: people(3, 'ai', 6), ledger });
  assert.equal(second.quota?.ok, false, 'ai 名额 7，已发 6 + 本批 3');
  assert.throws(() => verifyApproval(second, approve(second)), ApprovalError);
  verifyApproval(second, approve(second, { overrideReason: '赞助商联合分享，组委会同意' }));
});

test('讲者婉拒后释放名额，候补可递补', async () => {
  const ledger = new MemoryLedger();
  const first = await plan({ ev, template: 'cfp-accept', candidates: people(5, 'global'), ledger });
  await sendBatch({ batch: first, approval: approve(first), ledger, send: async () => {} });
  const blocked = await plan({ ev, template: 'cfp-accept', candidates: people(1, 'global', 5), ledger });
  assert.equal(blocked.quota?.ok, false, 'global 名额 5 已满');
  const refill = await plan({ ev, template: 'cfp-accept', candidates: people(1, 'global', 5), ledger, freed: ['recglobal0'] });
  assert.equal(refill.quota?.ok, true);
});

test('名单变化后旧审批失效；人数输错拒绝', async () => {
  const ledger = new MemoryLedger();
  const b = await plan({ ev, template: 'cfp-accept', candidates: people(2, 'global'), ledger });
  const changed = await plan({ ev, template: 'cfp-accept', candidates: people(3, 'global'), ledger });
  assert.throws(() => verifyApproval(changed, approve(b)), /过期/);
  assert.throws(() => verifyApproval(b, { ...approve(b), confirmCount: 29 }), /人数不符/);
});

test('同邮箱 / 非法邮箱被清洗', async () => {
  const ledger = new MemoryLedger();
  const c = [...people(2, 'spark'), { recordId: 'dup', email: 'SPARK0@x.com ', name: '重复', track: 'spark' }, { recordId: 'bad', email: 'nope', name: '坏', track: 'spark' }];
  const b = await plan({ ev, template: 'cfp-accept', candidates: c, ledger });
  assert.equal(b.recipients.length, 2);
});

test('投递失败不自动重试；人工确认后可释放', async () => {
  const ledger = new MemoryLedger();
  const b = await plan({ ev, template: 'cfp-accept', candidates: people(1, 'ai'), ledger });
  const r = await sendBatch({ batch: b, approval: approve(b), ledger, send: async () => { throw new Error('smtp down'); } });
  assert.equal(r.failed.length, 1);
  const re = await plan({ ev, template: 'cfp-accept', candidates: people(1, 'ai'), ledger });
  assert.equal(re.recipients.length, 0, '失败记录仍占位，避免「其实已送达」时重复');
  assert.equal(await releaseFailed(ledger, 'cfp-accept', 'recai0'), true);
  assert.equal((await plan({ ev, template: 'cfp-accept', candidates: people(1, 'ai'), ledger })).recipients.length, 1);
});

test('testTo 改投且不回写状态', async () => {
  const ledger = new MemoryLedger();
  const b = await plan({ ev, template: 'cfp-accept', candidates: people(1, 'ai'), ledger });
  const to: string[] = [];
  let writes = 0;
  await sendBatch({ batch: b, approval: approve(b), ledger, testTo: 'qa@x.com', send: async (x) => void to.push(x.email), onSent: async () => void writes++ });
  assert.deepEqual(to, ['qa@x.com']);
  assert.equal(writes, 0);
});

test('录用邮件包含材料规范；提醒按 D-N 命中', () => {
  const mail = render(ev, 'cfp-accept', { recordId: 'r', email: 'a@x.com', name: '张三', vars: { talk: 'Agent 实战', portalUrl: 'https://x/portal' } });
  assert.match(mail.html, /4:5/);
  assert.match(mail.html, /每分钟不超过 1.5 页/);
  const due = dueReminders(ev, '2026-09-27', [
    { recordId: 'a', email: 'a@x.com', name: 'A', audience: 'speaker', missing: speakerMissing({ status: '已确认', photo: 'p' }) },
    { recordId: 'b', email: 'b@x.com', name: 'B', audience: 'speaker', missing: speakerMissing({ status: '已确认', photo: 'p', deck: 'd' }) },
  ]);
  assert.equal(due.length, 1);
  assert.equal(due[0].template, 'reminder:deck-draft@-20');
  assert.deepEqual(due[0].recipients.map((r) => r.recordId), ['a']);
  assert.match(render(ev, due[0].template, due[0].recipients[0]).subject, /PPT 初稿/);
});

test('互斥：已发录用信的人不会再收到拒信 / 候补信（即使飞书状态被改回「拒绝」）', async () => {
  const ledger = new MemoryLedger();
  const a = await plan({ ev, template: 'cfp-accept', candidates: people(2, 'ai'), ledger });
  await sendBatch({ batch: a, approval: approve(a), ledger, send: async () => {} });
  const d = await plan({ ev, template: 'cfp-decline', candidates: [...people(2, 'ai'), ...people(1, 'spark')], ledger });
  assert.deepEqual(d.recipients.map((r) => r.recordId), ['recspark0']);
  assert.equal(d.blocked.length, 2);
  assert.ok(d.warnings.some((w) => w.includes('误改')));
});

test('时间窗：活动结束后不能发录用信，活动前不能发感谢信', async () => {
  const ledger = new MemoryLedger();
  await assert.rejects(plan({ ev, template: 'cfp-accept', candidates: people(1, 'ai'), ledger }, new Date('2026-10-20T02:00:00Z')), /活动已结束/);
  await assert.rejects(plan({ ev, template: 'thanks-speaker', candidates: people(1, 'ai'), ledger }), /活动日/);
  const t = await plan({ ev, template: 'thanks-speaker', candidates: people(1, 'ai'), ledger }, new Date('2026-10-18T02:00:00Z'));
  assert.equal(t.recipients.length, 1);
  assert.equal(t.quota, null, '感谢信不占名额');
});

test('发送中断卡在 claimed：15 分钟后可人工释放，之前不行', async () => {
  const ledger = new MemoryLedger();
  const at = '2026-09-05T02:00:00.000Z';
  await ledger.claim({ key: 'cfp-accept#x', template: 'cfp-accept', recordId: 'x', email: 'x@x.com', batchId: 'b', status: 'claimed', at });
  assert.equal(await releaseFailed(ledger, 'cfp-accept', 'x', Date.parse(at) + 60_000), false);
  assert.equal(await releaseFailed(ledger, 'cfp-accept', 'x', Date.parse(at) + 16 * 60_000), true);
});
