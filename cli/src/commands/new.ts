/**
 * cdkit new <slug> --from <上一届 slug> --date YYYY-MM-DD [--city 杭州] [--name "..."]
 *
 * 复制上一届配置 → 所有截止日期按活动日的差值整体平移 → 清空飞书表 ID / 报名链接。
 * 保留注释与格式（YAML Document API），赛道 / 名额 / 材料规范 / 提醒规则直接继承，按需微调。
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { addDays, diffDays, parseEvent, lintEvent } from '@cdkit/core';
import { eventDir, log } from '../ctx.ts';

export function cloneEventYaml(text: string, opts: { slug: string; date: string; city?: string; name?: string }): string {
  const doc = YAML.parseDocument(text);
  const oldDate = String(doc.get('date'));
  const delta = diffDays(opts.date, oldDate);
  doc.set('slug', opts.slug);
  doc.set('date', opts.date);
  const deadlines = doc.get('deadlines') as YAML.YAMLMap;
  for (const item of deadlines.items) {
    const v = String((item.value as YAML.Scalar).value);
    (item.value as YAML.Scalar).value = addDays(v, delta);
  }
  if (opts.city) doc.setIn(['city', 'zh'], opts.city);
  if (opts.name) doc.setIn(['name', 'zh'], opts.name);
  doc.set('registerUrl', null);
  const tables = doc.getIn(['feishu', 'tables']) as YAML.YAMLMap | undefined;
  for (const item of tables?.items ?? []) (item.value as YAML.Scalar).value = '';
  // 上一届的文件头注释描述的是上一届，替换掉（字段上的说明性注释保留）
  const first = (doc.contents as YAML.YAMLMap).items[0];
  if (first && YAML.isNode(first.key)) first.key.commentBefore = undefined;
  doc.commentBefore = ` ${opts.slug} —— 由 cdkit new 从 ${oldDate} 那一届复制，日期整体平移 ${delta} 天。\n 请检查：name / slogan / domain / venue / tracks.quota / theme / team`;
  return doc.toString();
}

export function run(args: string[], flags: Record<string, string | boolean>) {
  const slug = args[0];
  const from = String(flags.from ?? '');
  const date = String(flags.date ?? '');
  if (!slug || !from || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('用法：cdkit new <slug> --from <上一届 slug> --date YYYY-MM-DD [--city 城市] [--name 活动名]');
  }
  const dst = eventDir(slug);
  if (existsSync(path.join(dst, 'event.yaml'))) throw new Error(`events/${slug} 已存在`);
  const src = eventDir(from);
  const text = cloneEventYaml(readFileSync(path.join(src, 'event.yaml'), 'utf8'), {
    slug,
    date,
    city: flags.city ? String(flags.city) : undefined,
    name: flags.name ? String(flags.name) : undefined,
  });
  const ev = parseEvent(text);
  mkdirSync(dst, { recursive: true });
  writeFileSync(path.join(dst, 'event.yaml'), text);
  // 站点覆盖层（KV、文案、logo）一并复制，作为改版起点
  if (existsSync(path.join(src, 'site'))) cpSync(path.join(src, 'site'), path.join(dst, 'site'), { recursive: true });
  log(`✓ 已创建 events/${slug}（活动日 ${ev.date}）`);
  log('  截止日期：');
  for (const [k, v] of Object.entries(ev.deadlines)) log(`    ${k.padEnd(18)} ${v}`);
  const issues = lintEvent(ev);
  if (issues.length) log(`\n  需要注意：\n${issues.map((i) => `    - ${i}`).join('\n')}`);
  log(`\n下一步：\n  1. 编辑 events/${slug}/event.yaml（名称 / 场地 / 名额 / 团队）\n  2. cdkit feishu:init ${slug} --apply   建飞书表\n  3. cdkit plan ${slug}                  生成倒排计划\n  4. cdkit use ${slug} && npm run dev --prefix apps/web`);
}
