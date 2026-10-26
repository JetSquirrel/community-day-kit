/**
 * cdkit —— Community Day 运营命令行
 *
 *   new <slug> --from <上一届> --date YYYY-MM-DD   复制上一届，日期整体平移
 *   check <slug>                                    校验 event.yaml（结构 + 业务自洽）
 *   plan <slug> [--push]                            倒排计划 → CSV / ICS / MD（/ 飞书项目总表）
 *   use <slug>                                      切换当前活动：生成官网 / 后端的 event.generated.json
 *   feishu:init <slug> [--apply]                    按 schema 建表 / 补列
 *   outbox:preview <slug> [--template cfp-accept]   录用邮件发送预演 + 名额校验（只读）
 *   ai:cfp <slug> [--write]                         CFP 预审参考写入投稿表
 *   minutes <slug> <纪要.md|目录...> [--push]       会议纪要 → 待办 / 决定 / 参数变化
 *   copy tweet|xhs|speakers <slug> ...              推文初稿 / 小红书文案池 / 嘉宾资料润色英译
 */
import { parseArgs } from 'node:util';
import { lintEvent } from '@cdkit/core';
import { event, log } from './ctx.ts';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  strict: false,
  options: { from: { type: 'string' }, date: { type: 'string' }, city: { type: 'string' }, name: { type: 'string' }, template: { type: 'string' }, count: { type: 'string' } },
});
const [cmd, ...args] = positionals;
const flags = values as Record<string, string | boolean>;

const commands: Record<string, () => Promise<unknown> | unknown> = {
  new: async () => (await import('./commands/new.ts')).run(args, flags),
  check: () => {
    const ev = event(args[0]);
    const issues = lintEvent(ev);
    log(issues.length ? `⚠ ${issues.length} 个问题：\n${issues.map((i) => `  - ${i}`).join('\n')}` : `✓ events/${ev.slug}/event.yaml 校验通过`);
    if (issues.length) process.exitCode = 1;
  },
  plan: async () => (await import('./commands/plan.ts')).run(args, flags),
  use: async () => (await import('./commands/use.ts')).run(args),
  'feishu:init': async () => (await import('./commands/feishu-init.ts')).run(args, flags),
  'outbox:preview': async () => (await import('./commands/outbox.ts')).run(args, flags),
  'ai:cfp': async () => (await import('./commands/ai-cfp.ts')).run(args, flags),
  minutes: async () => (await import('./commands/minutes.ts')).run(args, flags),
  copy: async () => (await import('./commands/copy.ts')).run(args, flags),
};

const fn = cmd ? commands[cmd] : undefined;
if (!fn) {
  log(`用法：cdkit <命令>\n命令：${Object.keys(commands).join(' | ')}\n详见 cli/src/index.ts 顶部说明或 README。`);
  process.exitCode = cmd ? 1 : 0;
} else {
  try {
    await fn();
  } catch (e) {
    console.error(`✗ ${(e as Error).message}`);
    process.exitCode = 1;
  }
}
