import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { EventConfig } from './schema.ts';

/** 读取并校验 events/<slug>/event.yaml。校验失败抛出带字段路径的可读错误。 */
export function loadEvent(dirOrFile: string): EventConfig {
  const file = dirOrFile.endsWith('.yaml') ? dirOrFile : path.join(dirOrFile, 'event.yaml');
  if (!existsSync(file)) throw new Error(`找不到活动配置：${file}`);
  return parseEvent(readFileSync(file, 'utf8'), file);
}

export function parseEvent(text: string, source = 'event.yaml'): EventConfig {
  const raw = YAML.parse(text);
  const res = EventConfig.safeParse(raw);
  if (!res.success) {
    const lines = res.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`);
    throw new Error(`${source} 校验失败：\n${lines.join('\n')}`);
  }
  return res.data;
}

/** 取双语文本 */
export function t(v: string | { zh: string; en?: string }, lang: 'zh' | 'en' = 'zh'): string {
  if (typeof v === 'string') return v;
  return lang === 'en' ? v.en || v.zh : v.zh;
}
