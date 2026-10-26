import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEvent, type EventConfig } from '@cdkit/core';
import { Feishu } from '@cdkit/feishu';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const eventDir = (slug: string) => path.join(ROOT, 'events', slug);
export const outDir = (slug: string) => {
  const d = path.join(ROOT, 'out', slug);
  mkdirSync(d, { recursive: true });
  return d;
};
export const playbookFiles = () => ['milestones', 'tweets', 'design'].map((f) => path.join(ROOT, 'playbook', `${f}.yaml`));

// 仓库根目录 .env（FEISHU_APP_ID / FEISHU_APP_SECRET / AWS_PROFILE ...）
if (existsSync(path.join(ROOT, '.env'))) process.loadEnvFile(path.join(ROOT, '.env'));

export function event(slug: string | undefined): EventConfig {
  if (!slug) throw new Error('缺少活动 slug，例如：cdkit plan 2026-autumn-shenzhen');
  return loadEvent(eventDir(slug));
}

export function feishu(): Feishu {
  const { FEISHU_APP_ID, FEISHU_APP_SECRET } = process.env;
  if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) throw new Error('需要环境变量 FEISHU_APP_ID / FEISHU_APP_SECRET（可写在仓库根目录 .env）');
  return new Feishu(FEISHU_APP_ID, FEISHU_APP_SECRET);
}

export function write(slug: string, name: string, content: string): string {
  const f = path.join(outDir(slug), name);
  writeFileSync(f, content);
  return path.relative(ROOT, f);
}

export const log = (...a: unknown[]) => console.log(...a);
