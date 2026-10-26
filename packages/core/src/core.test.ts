import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEvent, parseEvent, lintEvent, buildPlan, loadPlaybook, checkQuota, addDays, dLabel, planToCsv, planToIcs } from './index.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sample = path.join(root, 'events/2026-autumn-shenzhen');
const playbook = ['milestones', 'tweets', 'design'].map((f) => path.join(root, 'playbook', `${f}.yaml`));

test('样例配置可加载且通过业务校验', () => {
  const ev = loadEvent(sample);
  assert.equal(ev.date, '2026-10-17');
  assert.deepEqual(lintEvent(ev), []);
});

test('校验错误带字段路径', () => {
  assert.throws(() => parseEvent('slug: Bad Slug\n'), /slug/);
});

test('lint 能发现日期倒挂与国庆终稿', () => {
  const ev = loadEvent(sample);
  const bad = { ...ev, deadlines: { ...ev.deadlines, deckFinal: '2026-10-03', deckDraft: '2026-10-05' } };
  const issues = lintEvent(bad);
  assert.ok(issues.some((i) => i.includes('倒挂')));
  assert.ok(issues.some((i) => i.includes('国庆')));
});

test('日期工具', () => {
  assert.equal(addDays('2026-10-17', -47), '2026-08-31');
  assert.equal(dLabel('2026-08-31', '2026-10-17'), 'D-47');
  assert.equal(dLabel('2026-10-17', '2026-10-17'), 'D-Day');
});

test('倒排计划：锚点解析、排序、导出', () => {
  const ev = loadEvent(sample);
  const rows = buildPlan(ev, loadPlaybook(playbook));
  assert.ok(rows.length > 30);
  const launch = rows.find((r) => r.id === 'tw-launch')!;
  assert.equal(launch.due, '2026-08-31');
  assert.equal(rows.find((r) => r.id === 'deck-final')!.due, '2026-10-09');
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].due <= rows[i].due);
  assert.match(planToCsv(rows), /截止日期/);
  assert.match(planToIcs(ev, rows), /BEGIN:VEVENT/);
  // 换一届：只改活动日，推文日期整体平移
  const next = buildPlan({ ...ev, date: '2027-05-15' }, loadPlaybook(playbook));
  assert.equal(next.find((r) => r.id === 'tw-launch')!.due, addDays('2027-05-15', -47));
});

test('名额校验：复现 2026 秋超发（需要 18，发出 29）会被拦截', () => {
  const ev = loadEvent(sample);
  const cfpTracks = ['ai', 'global', 'spark'];
  const pending = Array.from({ length: 29 }, (_, i) => ({ track: cfpTracks[i % 3] }));
  const r = checkQuota(ev, [], pending);
  assert.equal(r.ok, false);
  assert.ok(r.lines.some((l) => l.over > 0));
  // 恰好 18 个：通过
  const ok = checkQuota(ev, [], [...Array(7).fill({ track: 'ai' }), ...Array(5).fill({ track: 'global' }), ...Array(6).fill({ track: 'spark' })]);
  assert.equal(ok.ok, true);
  // 已发 + 本批 一起算
  assert.equal(checkQuota(ev, Array(7).fill({ track: 'ai' }), [{ track: 'ai' }]).ok, false);
  // 赛道值写错也拦截
  assert.equal(checkQuota(ev, [], [{ track: 'AI' }]).ok, false);
});
