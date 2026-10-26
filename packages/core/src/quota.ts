/**
 * 名额校验——防止 2026 秋「原本只需 18 位讲者，实际发出 29 封确认通知」重演。
 *
 * committed = 已经发过录用/已确认的人数（不可撤回）；
 * pending   = 本批次准备发的人数。
 * 任一赛道 committed + pending > quota 即拒绝整个批次，除非显式 override（并留痕）。
 */
import type { EventConfig } from './schema.ts';

export interface QuotaLine {
  track: string;
  quota: number;
  committed: number;
  pending: number;
  remaining: number;
  over: number;
}

export interface QuotaReport {
  ok: boolean;
  lines: QuotaLine[];
  unknownTracks: string[];
  total: { quota: number; committed: number; pending: number };
}

export function checkQuota(
  ev: EventConfig,
  committed: { track: string }[],
  pending: { track: string }[],
): QuotaReport {
  const known = new Map(ev.tracks.map((t) => [t.id, t.quota]));
  const count = (rows: { track: string }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.track, (m.get(r.track) ?? 0) + 1);
    return m;
  };
  const c = count(committed);
  const p = count(pending);
  const unknownTracks = [...new Set([...c.keys(), ...p.keys()])].filter((k) => !known.has(k));
  const lines: QuotaLine[] = ev.tracks.map((t) => {
    const committedN = c.get(t.id) ?? 0;
    const pendingN = p.get(t.id) ?? 0;
    const over = Math.max(0, committedN + pendingN - t.quota);
    return { track: t.id, quota: t.quota, committed: committedN, pending: pendingN, remaining: Math.max(0, t.quota - committedN - pendingN), over };
  });
  const total = {
    quota: lines.reduce((s, l) => s + l.quota, 0),
    committed: committed.length,
    pending: pending.length,
  };
  // 未知赛道的待发记录同样拦截（多半是飞书里赛道值写错/改名）
  const unknownPending = [...p.keys()].some((k) => !known.has(k));
  return { ok: lines.every((l) => l.over === 0) && !unknownPending, lines, unknownTracks, total };
}

export function formatQuota(r: QuotaReport): string {
  const rows = r.lines.map(
    (l) => `${l.over ? '✗' : '✓'} ${l.track.padEnd(10)} 名额 ${String(l.quota).padStart(3)} | 已发 ${String(l.committed).padStart(3)} | 本批 ${String(l.pending).padStart(3)} | ${l.over ? `超出 ${l.over}` : `剩余 ${l.remaining}`}`,
  );
  if (r.unknownTracks.length) rows.push(`✗ 未知赛道：${r.unknownTracks.join(', ')}（检查飞书「赛道」列取值）`);
  rows.push(`合计：名额 ${r.total.quota}，已发 ${r.total.committed}，本批 ${r.total.pending}`);
  return rows.join('\n');
}
