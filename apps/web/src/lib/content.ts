/**
 * Runtime content store (see lambda/feishu-content-sync).
 *
 * Speakers & partners are edited in a Feishu bitable; a Lambda syncs them to
 * an S3 bucket as JSON. When `VITE_CONTENT_BASE_URL` is set (Amplify env var),
 * the app fetches those JSON files at runtime and hot-swaps the data — no
 * rebuild needed for content updates. When unset or unreachable, the bundled
 * fallback data keeps the site fully functional.
 */
import { useSyncExternalStore } from 'react';
import { SPEAKERS as FALLBACK_SPEAKERS, SESSIONS as FALLBACK_SESSIONS, TRACKS, scheduledTrack } from '@/components/schedule/data';
import type { Speaker, Session } from '@/components/schedule/data';

/** A co-builder logo on the walls — bundled roster + Feishu sponsors.json. */
export interface Partner {
  id: string;
  name: string;
  url?: string;
  logo?: string;
  /** 意向档位（钻石/铂金/金牌/银牌赞助）——首页赞助墙按档分区用 */
  tier?: string;
}

const BASE = (import.meta.env.VITE_CONTENT_BASE_URL as string | undefined)?.replace(/\/+$/, '') ?? '';

// ——— external store ———

let speakers: Speaker[] = FALLBACK_SPEAKERS;
let partners: Partner[] = [];
/** 日程以内置 SESSIONS（9-24 最终议程）为准，不再由嘉宾表「时间」派生覆盖。 */
const sessions: Session[] = FALLBACK_SESSIONS;
/** 首次内容拉取已结束（成败都算）——false 期间页面应显示加载骨架而非空白。 */
let ready = !BASE;
const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Live speaker list — bundled data first, remote data hot-swaps in. */
export function useSpeakers(): Speaker[] {
  return useSyncExternalStore(subscribe, () => speakers);
}

/** Live partner list — empty until sponsors.json arrives. */
export function usePartners(): Partner[] {
  return useSyncExternalStore(subscribe, () => partners);
}

/** Session list — the bundled final agenda. */
export function useSessions(): Session[] {
  return useSyncExternalStore(subscribe, () => sessions);
}

/** 首次内容拉取是否已结束（成败都算）——false 期间页面应显示加载骨架而非空白。 */
export function useContentReady(): boolean {
  return useSyncExternalStore(subscribe, () => ready);
}

/** Parse "13:30–14:05" (also - — ~) → { start, end } or null. */
function parseTimeRange(time: string): { start: string; end: string } | null {
  const m = time.match(/(\d{1,2}:\d{2})\s*[-–—~]\s*(\d{1,2}:\d{2})/);
  return m ? { start: m[1], end: m[2] } : null;
}

/** LTextLike（远程可能是纯中文字符串）→ Session 需要的 LText。 */
const toLText = (x: Speaker['talk']): Session['title'] => (typeof x === 'string' ? { zh: x } : x);

/**
 * Derive timetable sessions from speakers: every speaker with a 时间 slot
 * becomes a talk session (keynote track → KEYNOTE/main slot, else SESSION,
 * am/pm by start time). Ordered by start time.
 */
export function deriveSessions(list: Speaker[]): Session[] {
  const out: Session[] = [];
  for (const s of list) {
    if (!s.time) continue;
    const range = parseTimeRange(s.time);
    if (!range) continue;
    const track = TRACKS.find((t) => t.id === s.track);
    out.push({
      id: `sp-${s.id}`,
      start: range.start,
      end: range.end,
      track: s.track,
      type: s.track === 'keynote' ? 'KEYNOTE' : 'SESSION',
      title: toLText(s.talk),
      room: s.track === 'keynote' ? { zh: '主会场 MAIN HALL', en: 'MAIN HALL' } : { zh: track?.no ?? '', en: track?.no ?? '' },
      speakerIds: [s.id],
      abstract: toLText(s.bio),
      slot: s.track === 'keynote' ? 'main' : Number(range.start.slice(0, 2)) < 12 ? 'am' : 'pm',
    });
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

/** Resolve session.speakerIds against a speaker list, order preserved. */
export function resolveSpeakers(all: Speaker[], ids: string[]): Speaker[] {
  return ids.map((id) => all.find((s) => s.id === id)).filter((s): s is Speaker => Boolean(s));
}

// ——— runtime fetch (fails soft → bundled data stays) ———

/** Text fields accept both remote plain strings (zh-only) and { zh, en? } LText objects. */
function isLTextLike(x: unknown): boolean {
  return typeof x === 'string' || (typeof x === 'object' && x !== null && typeof (x as { zh?: unknown }).zh === 'string');
}

function isSpeaker(x: unknown): x is Speaker {
  const s = x as Speaker;
  return Boolean(
    s &&
      typeof s.id === 'string' &&
      isLTextLike(s.name) &&
      typeof s.track === 'string' &&
      isLTextLike(s.talk) &&
      typeof s.initials === 'string',
  );
}

function isPartner(x: unknown): x is Partner {
  const p = x as Partner;
  return Boolean(p && typeof p.id === 'string' && typeof p.name === 'string');
}

async function load<T>(path: string, guard: (x: unknown) => x is T): Promise<T[] | null> {
  const res = await fetch(`${BASE}/${path}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const data: unknown = await res.json();
  return Array.isArray(data) && data.every(guard) ? data : null;
}

if (BASE) {
  void Promise.all([load<Speaker>('speakers.json', isSpeaker), load<Partner>('sponsors.json', isPartner)])
    .then(([sp, pa]) => {
      // a non-empty remote list wins; an empty one never blanks the page
      if (sp && sp.length > 0) {
        // 赛道以议程分到的桥为准，讲者页筛选才和日程一致
        speakers = sp.map((s) => ({ ...s, track: scheduledTrack(s) }));
      }
      if (pa) {
        partners = pa;
      }
      ready = true;
      listeners.forEach((l) => l());
    })
    .catch(() => {
      /* network/CORS failure → keep bundled content */
      ready = true;
      listeners.forEach((l) => l());
    });
}
