/**
 * cdkit minutes <slug> <纪要.md | 纪要.zip 解压目录 ...> [--push]
 * 飞书「智能纪要」导出的 markdown → 待办 / 决定 / 待决问题 / 需同步到 event.yaml 的参数变化。
 * --push 写入飞书「待办」表（按「事项+负责人」去重）。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { createAi, digestMinutes, type MinutesDigest } from '@cdkit/ai';
import { asText } from '@cdkit/feishu';
import { event, feishu, log, write } from '../ctx.ts';

function collect(p: string): string[] {
  if (statSync(p).isDirectory()) return readdirSync(p).flatMap((f) => collect(path.join(p, f)));
  return p.endsWith('.md') ? [p] : [];
}

/** 去掉图片引用，节省 token */
const clean = (md: string) => md.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\n{3,}/g, '\n\n');

export async function run(args: string[], flags: Record<string, string | boolean>) {
  const ev = event(args[0]);
  const files = args.slice(1).flatMap(collect);
  if (!files.length) throw new Error('用法：cdkit minutes <slug> <纪要.md 或目录...> [--push]');
  const ai = createAi(ev);
  const all: (MinutesDigest & { source: string })[] = [];
  for (const f of files) {
    log(`… ${path.basename(f)}`);
    const d = await digestMinutes(ai, ev, clean(readFileSync(f, 'utf8')));
    all.push({ ...d, source: path.basename(f, '.md') });
    log(`  待办 ${d.todos.length} · 决定 ${d.decisions.length} · 待决 ${d.openQuestions.length} · 参数变化 ${d.configChanges.length}`);
  }

  const md: string[] = [`# 纪要汇总 · ${ev.slug}`, ''];
  for (const d of all) {
    md.push(`## ${d.source}（${d.meetingDate}）`, '', '### 待办', '| 优先级 | 事项 | 负责人 | 截止 |', '|---|---|---|---|');
    for (const t of d.todos) md.push(`| ${t.priority} | ${t.task} | ${t.owner} | ${t.due ?? '—'} |`);
    if (d.decisions.length) md.push('', '### 决定', ...d.decisions.map((x) => `- ${x}`));
    if (d.openQuestions.length) md.push('', '### 待决问题', ...d.openQuestions.map((x) => `- ${x}`));
    if (d.configChanges.length) md.push('', '### ⚠ 需同步到 event.yaml', ...d.configChanges.map((c) => `- \`${c.field}\` → ${c.value}（「${c.quote}」）`));
    md.push('');
  }
  log(`\n✓ ${write(ev.slug, 'minutes.md', md.join('\n'))}`);
  write(ev.slug, 'minutes.json', JSON.stringify(all, null, 2));

  if (flags.push) {
    const table = ev.feishu.tables.todos;
    if (!table) throw new Error('feishu.tables.todos 未配置，先运行 cdkit feishu:init --apply');
    const fs = feishu();
    const seen = new Set((await fs.listRecords(ev.feishu.appToken, table)).map((r) => `${asText(r.fields['事项'])}|${asText(r.fields['负责人'])}`));
    const rows = all.flatMap((d) =>
      d.todos
        .filter((t) => !seen.has(`${t.task}|${t.owner}`))
        .map((t) => ({ 事项: t.task, 负责人: t.owner, 截止: t.due ?? '', 状态: '未开始', 来源: `${d.source}`, 原文: t.quote, 优先级: t.priority })),
    );
    await fs.batchCreate(ev.feishu.appToken, table, rows);
    log(`✓ 飞书待办表新增 ${rows.length} 条`);
  }
}
