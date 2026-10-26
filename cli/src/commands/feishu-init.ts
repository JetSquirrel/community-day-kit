/**
 * cdkit feishu:init <slug> [--apply]
 * 按 @cdkit/feishu tableDefs 检查多维表格：缺表建表、缺列补列（不删不改已有列），
 * 并把新建表的 table_id 写回 event.yaml。不带 --apply 时只打印差异。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { tableDefs } from '@cdkit/feishu';
import { event, eventDir, feishu, log } from '../ctx.ts';

export async function run(args: string[], flags: Record<string, string | boolean>) {
  const ev = event(args[0]);
  const defs = tableDefs(ev);
  if (!ev.feishu.appToken) {
    log('event.yaml feishu.appToken 为空。先在飞书新建一个多维表格，把 URL 中 /base/<app_token> 填入，并把自建应用加为协作者。\n将创建的表：');
    for (const d of defs) log(`  - ${d.name}：${d.fields.map((f) => f.field_name).join('、')}`);
    return;
  }
  const fs = feishu();
  const tables = await fs.listTables(ev.feishu.appToken);
  const ids: Record<string, string> = {};
  for (const def of defs) {
    const configured = ev.feishu.tables[def.key];
    const found = tables.find((t) => t.table_id === configured) ?? tables.find((t) => t.name === def.name);
    if (!found) {
      log(`+ 表「${def.name}」不存在${flags.apply ? '，创建中' : ''}`);
      if (flags.apply) {
        const { table_id } = await fs.createTable(ev.feishu.appToken, { name: def.name, fields: def.fields.map(({ note: _n, ...f }) => f) });
        ids[def.key] = table_id;
      }
      continue;
    }
    ids[def.key] = found.table_id;
    const have = new Set((await fs.listFields(ev.feishu.appToken, found.table_id)).map((f) => f.field_name));
    const missing = def.fields.filter((f) => !have.has(f.field_name));
    log(`${missing.length ? '~' : '✓'} 表「${def.name}」(${found.table_id})${missing.length ? ` 缺列：${missing.map((f) => f.field_name).join('、')}` : ''}`);
    if (flags.apply) for (const { note: _n, ...f } of missing) await fs.createField(ev.feishu.appToken, found.table_id, f);
  }
  if (flags.apply) {
    const file = path.join(eventDir(ev.slug), 'event.yaml');
    const doc = YAML.parseDocument(readFileSync(file, 'utf8'));
    for (const [k, v] of Object.entries(ids)) doc.setIn(['feishu', 'tables', k], v);
    writeFileSync(file, doc.toString());
    log(`\n✓ 已写回 events/${ev.slug}/event.yaml feishu.tables`);
  } else {
    log('\n（预览模式，加 --apply 执行）');
  }
}
