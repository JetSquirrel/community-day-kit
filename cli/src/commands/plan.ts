/**
 * cdkit plan <slug> [--push]
 * 生成倒排计划：out/<slug>/plan.csv（导入飞书「项目总表」）、plan.ics（日历）、plan.md；
 * --push 直接写入飞书「项目总表」（按 ID 去重，已存在的只更新日期，不覆盖状态 / 负责人）。
 */
import { assignOwners, buildPlan, loadPlaybook, planToCsv, planToIcs, planToMarkdown } from '@cdkit/core';
import { asText } from '@cdkit/feishu';
import { event, feishu, log, playbookFiles, write } from '../ctx.ts';

export async function run(args: string[], flags: Record<string, string | boolean>) {
  const ev = event(args[0]);
  const rows = assignOwners(ev, buildPlan(ev, loadPlaybook(playbookFiles())));
  log(`✓ ${rows.length} 项`);
  log(`  ${write(ev.slug, 'plan.csv', planToCsv(rows))}`);
  log(`  ${write(ev.slug, 'plan.ics', planToIcs(ev, rows))}`);
  log(`  ${write(ev.slug, 'plan.md', planToMarkdown(ev, rows))}`);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = rows.filter((r) => r.due >= today).slice(0, 8);
  if (upcoming.length) {
    log('\n接下来：');
    for (const r of upcoming) log(`  ${r.due} ${r.d.padEnd(6)} ${r.title}（${r.assignee || r.owner}）`);
  }

  if (flags.push) {
    const table = ev.feishu.tables.plan;
    if (!ev.feishu.appToken || !table) throw new Error('event.yaml feishu.tables.plan 未配置，先运行 cdkit feishu:init --apply');
    const fs = feishu();
    const existing = new Map((await fs.listRecords(ev.feishu.appToken, table)).map((r) => [asText(r.fields['ID']), r.record_id]));
    const toFields = (r: (typeof rows)[number]) => ({ 事项: r.title, 截止日期: r.due, 倒计时: r.d, 阶段: r.phase, 类型: r.kind, 角色: r.owner, 说明: r.detail, 自动化: r.automation, ID: r.id });
    const creates = rows.filter((r) => !existing.has(r.id)).map((r) => ({ ...toFields(r), 负责人: r.assignee, 状态: '未开始' }));
    const updates = rows.filter((r) => existing.has(r.id)).map((r) => ({ record_id: existing.get(r.id)!, fields: { 截止日期: r.due, 倒计时: r.d } }));
    await fs.batchCreate(ev.feishu.appToken, table, creates);
    await fs.batchUpdate(ev.feishu.appToken, table, updates);
    log(`\n✓ 飞书项目总表：新增 ${creates.length}，更新日期 ${updates.length}`);
  }
}
