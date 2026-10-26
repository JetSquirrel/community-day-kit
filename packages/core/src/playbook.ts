/**
 * 倒排运营计划（playbook）。
 *
 * playbook/*.yaml 里每一项都用「锚点 + 偏移」描述时间（如 anchor: date, offset: -47），
 * 换一届活动只改 event.yaml 的日期，全部里程碑、推文排期、设计物料截止日自动重算。
 * 内容来自 2026 秋深圳场的推文时间轴 / 设计图汇总清单 / 周会纪要，
 * 并标注了每一项「工具替你做了什么」(automation)，让人只做需要判断的事。
 */
import { readFileSync } from 'node:fs';
import YAML from 'yaml';
import { z } from 'zod';
import type { EventConfig } from './schema.ts';
import { addDays, dLabel, weekday } from './dates.ts';

export const PlaybookItem = z.object({
  id: z.string(),
  phase: z.string(),
  title: z.string(),
  /** 角色（统筹/宣发/设计/讲师/赞助/志愿者/物料/场地/技术），由 team 映射到人 */
  owner: z.string(),
  /** 锚点：date（活动日）或 deadlines.<key> */
  anchor: z.string().default('date'),
  offset: z.number().int().default(0),
  detail: z.string().default(''),
  /** 依赖的素材 / 前置项 id */
  needs: z.array(z.string()).default([]),
  /** 本工具自动完成的部分（为空 = 纯人工） */
  automation: z.string().default(''),
  kind: z.enum(['milestone', 'tweet', 'design', 'ops']).default('milestone'),
});
export type PlaybookItem = z.infer<typeof PlaybookItem>;

export interface PlanRow extends PlaybookItem {
  due: string;
  d: string;
  weekday: string;
}

export function loadPlaybook(files: string[]): PlaybookItem[] {
  return files.flatMap((f) => z.array(PlaybookItem).parse(YAML.parse(readFileSync(f, 'utf8'))));
}

export function resolveAnchor(ev: EventConfig, anchor: string): string {
  if (anchor === 'date') return ev.date;
  const m = /^deadlines\.(\w+)$/.exec(anchor);
  const key = m?.[1] as keyof EventConfig['deadlines'] | undefined;
  if (key && ev.deadlines[key]) return ev.deadlines[key];
  throw new Error(`未知锚点：${anchor}（可用：date, deadlines.<key>）`);
}

export function buildPlan(ev: EventConfig, items: PlaybookItem[]): PlanRow[] {
  return items
    .map((it) => {
      const due = addDays(resolveAnchor(ev, it.anchor), it.offset);
      return { ...it, due, d: dLabel(due, ev.date), weekday: weekday(due) };
    })
    .sort((a, b) => a.due.localeCompare(b.due) || a.id.localeCompare(b.id));
}

/** 把角色映射成具体负责人（team[].role 可写多个角色，用 / 分隔） */
export function assignOwners(ev: EventConfig, rows: PlanRow[]): (PlanRow & { assignee: string })[] {
  return rows.map((r) => {
    const want = r.owner.split('/').map((s) => s.trim());
    const people = ev.team
      .filter((m) => !m.name.startsWith('（') && m.role.split('/').some((s) => want.includes(s.trim())))
      .map((m) => m.name);
    return { ...r, assignee: people.join('、') };
  });
}

const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** CSV（可直接导入飞书多维表格当作「项目总表」） */
export function planToCsv(rows: (PlanRow & { assignee?: string })[]): string {
  const head = ['截止日期', '星期', '倒计时', '阶段', '类型', '事项', '角色', '负责人', '说明', '自动化', 'ID'];
  const body = rows.map((r) =>
    [r.due, r.weekday, r.d, r.phase, r.kind, r.title, r.owner, r.assignee ?? '', r.detail, r.automation, r.id].map(csvCell).join(','),
  );
  return '\uFEFF' + [head.join(','), ...body].join('\n') + '\n';
}

/** ICS 日历（导入飞书 / Outlook，所有里程碑一目了然） */
export function planToIcs(ev: EventConfig, rows: PlanRow[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const events = rows.map((r) => {
    const day = r.due.replace(/-/g, '');
    const next = addDays(r.due, 1).replace(/-/g, '');
    return [
      'BEGIN:VEVENT',
      `UID:${ev.slug}-${r.id}@cdkit`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day}`,
      `DTEND;VALUE=DATE:${next}`,
      `SUMMARY:${esc(`[${r.d}] ${r.title}（${r.owner}）`)}`,
      `DESCRIPTION:${esc([r.detail, r.automation && `自动化：${r.automation}`].filter(Boolean).join('\n'))}`,
      'END:VEVENT',
    ].join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//cdkit//plan//ZH', ...events, 'END:VCALENDAR', ''].join('\r\n');
}

export function planToMarkdown(ev: EventConfig, rows: (PlanRow & { assignee?: string })[]): string {
  const out = [`# 倒排计划 · ${ev.slug}（活动日 ${ev.date}）`, '', '| 日期 | 倒计时 | 阶段 | 事项 | 负责 | 自动化 |', '|---|---|---|---|---|---|'];
  for (const r of rows) {
    out.push(`| ${r.due}（${r.weekday}） | ${r.d} | ${r.phase} | ${r.title} | ${r.assignee || r.owner} | ${r.automation || '—'} |`);
  }
  return out.join('\n') + '\n';
}
