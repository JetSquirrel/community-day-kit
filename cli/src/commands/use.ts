/**
 * cdkit use <slug> —— 切换「当前活动」，部署 / 本地开发前运行一次：
 *   apps/web/src/event.generated.json      官网读取的公开子集（不含飞书 token、团队、名额、AI 配置）
 *   backend/amplify/event.generated.json   后端完整配置（打进 Lambda 包）
 * apps/web 的 vite 配置据此加载 events/<slug>/site 覆盖层（KV、文案、logo）。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { EventConfig } from '@cdkit/core';
import { event, log, ROOT } from '../ctx.ts';

export function publicConfig(ev: EventConfig) {
  return {
    slug: ev.slug,
    name: ev.name,
    slogan: ev.slogan,
    date: ev.date,
    timezone: ev.timezone,
    city: ev.city,
    domain: ev.domain,
    contactEmail: ev.contactEmail,
    registerUrl: ev.registerUrl,
    expectedAttendees: ev.expectedAttendees,
    theme: ev.theme,
    venue: { name: ev.venue.name, address: ev.venue.address, mapUrl: ev.venue.mapUrl, rooms: ev.venue.rooms.filter((r) => r.kind !== 'storage') },
    tracks: ev.tracks.map(({ owners: _o, quota: _q, ...rest }) => rest),
    formats: ev.formats,
    deadlines: ev.deadlines,
    sponsorTiers: ev.sponsors.tiers,
    materials: ev.materials,
  };
}

export async function run(args: string[]) {
  const ev = event(args[0]);
  const web = path.join(ROOT, 'apps/web/src/event.generated.json');
  const api = path.join(ROOT, 'backend/amplify/event.generated.json');
  mkdirSync(path.dirname(web), { recursive: true });
  writeFileSync(web, JSON.stringify(publicConfig(ev), null, 2) + '\n');
  writeFileSync(api, JSON.stringify(ev, null, 2) + '\n');
  log(`✓ 当前活动：${ev.slug}\n  ${path.relative(ROOT, web)}\n  ${path.relative(ROOT, api)}`);
}
