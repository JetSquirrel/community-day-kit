import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseEvent, lintEvent } from '@cdkit/core';
import { cloneEventYaml } from './commands/new.ts';
import { publicConfig } from './commands/use.ts';
import { ROOT } from './ctx.ts';

const src = readFileSync(path.join(ROOT, 'events/2026-autumn-shenzhen/event.yaml'), 'utf8');

test('new：复制上一届并整体平移日期，清空飞书表 ID，保留注释', () => {
  const text = cloneEventYaml(src, { slug: '2027-spring-hangzhou', date: '2027-04-17', city: '中国 · 杭州' });
  const ev = parseEvent(text);
  assert.equal(ev.slug, '2027-spring-hangzhou');
  assert.equal(ev.date, '2027-04-17');
  // 原 cfpClose 2026-08-31 = D-47 → 新 D-47
  assert.equal(ev.deadlines.cfpClose, '2027-03-01');
  assert.equal(ev.feishu.tables.cfp, '');
  assert.equal(typeof ev.city === 'object' && ev.city.zh, '中国 · 杭州');
  assert.match(text, /quota = 本赛道可录用讲题上限/);
  assert.deepEqual(lintEvent(ev), []);
});

test('use：公开配置不泄露内部信息', () => {
  const pub = JSON.stringify(publicConfig(parseEvent(src)));
  assert.doesNotMatch(pub, /appToken|tblGfz|reviewers|team|quota/);
  assert.match(pub, /Bridge with Signal/);
});
