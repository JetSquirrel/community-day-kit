import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Reveal from '@/components/Reveal';
import SessionCard from './SessionCard';
import WorkshopGroup from './WorkshopGroup';
import { cn } from '@/lib/utils';
import { EASE_OUT, gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { pick, useLocale } from '@/lib/locale';
import { DAY_SEGMENTS, TRACKS, groupByTime, isLiveSlot, sessionById, sessionsByTrackSlot } from './data';
import type { DaySegment, Session, Track, TrackId } from './data';

export type ScheduleFilter = TrackId | 'all';

interface TimelineViewProps {
  filter: ScheduleFilter;
  onSelect: (session: Session) => void;
}

const PARALLEL_TRACKS = TRACKS.filter((t) => t.id !== 'keynote');

/**
 * 时间线视图 (schedule.md S3) — the bridge deck: 80px mono time rail + a 2px
 * ink spine with 12px pier dots per slot (live slot = Pulse Purple, breathing).
 * Parallel blocks render 4 bridge columns on desktop, a per-forum accordion on
 * mobile. The spine draws itself downward with scroll scrub (同首页 S8 语法).
 */
export default function TimelineView({ filter, onSelect }: TimelineViewProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from('.tl-spine-fill', {
        scaleY: 0,
        transformOrigin: '50% 0%',
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top 70%', end: 'bottom 80%', scrub: 0.4 },
      });
      gsap.from('.tl-pier', {
        scale: 0,
        transformOrigin: '50% 50%',
        ease: 'back.out(3)',
        duration: 0.4,
        stagger: 0.12,
        scrollTrigger: { trigger: root.current, start: 'top 70%', once: true },
      });
    },
    { scope: root },
  );

  const visibleSegments = DAY_SEGMENTS.filter((seg) => {
    if (filter === 'all') return true;
    if (seg.kind === 'main') return filter === 'keynote';
    return filter !== 'keynote';
  });

  return (
    <div ref={root} className="relative">
      {/* the spine — desktop only; mobile drops to a plain stacked flow */}
      <span className="absolute bottom-8 left-[95px] top-2 hidden w-[2px] bg-ink/15 md:block" aria-hidden="true">
        <span className="tl-spine-fill block h-full w-full bg-ink" />
      </span>
      <div className="space-y-12 md:space-y-16">
        {visibleSegments.map((seg) => (
          <SegmentBlock key={seg.id} seg={seg} filter={filter} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function SegmentBlock({ seg, filter, onSelect }: { seg: DaySegment; filter: ScheduleFilter; onSelect: (s: Session) => void }) {
  const locale = useLocale();
  const live = isLiveSlot(seg.time);
  return (
    <section className="md:grid md:grid-cols-[80px_32px_1fr]">
      {/* mobile slot header */}
      <div className="mb-4 flex items-center gap-3 md:hidden">
        <span className="rounded-full border-[3px] border-ink bg-white px-3 py-1 font-mono text-[13px] font-medium shadow-hard-sm">
          {seg.time}
        </span>
        <span className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-ink/70">{pick(seg.label, locale)}</span>
      </div>
      {/* desktop time rail */}
      <div className="hidden pt-1 text-right md:block">
        <span className="font-mono text-[15px] font-medium text-ink">{seg.time}</span>
      </div>
      {/* pier dot on the spine */}
      <div className="hidden justify-center md:flex" aria-hidden="true">
        <span
          className={cn('tl-pier relative z-10 mt-[7px] h-3 w-3 rounded-full border-[2.5px] border-ink', live ? 'bg-pulse' : 'bg-paper')}
        >
          {live && <span className="absolute inset-0 animate-ping rounded-full bg-pulse/60" />}
        </span>
      </div>
      {/* segment content */}
      <div className="min-w-0 md:pl-8">
        <p className="mb-4 hidden font-mono text-xs font-medium uppercase tracking-[0.14em] text-ink/70 md:block">{pick(seg.label, locale)}</p>
        {seg.kind === 'main' ? (
          <MainSessions seg={seg} onSelect={onSelect} />
        ) : (
          <ParallelBlock seg={seg} filter={filter} onSelect={onSelect} />
        )}
      </div>
    </section>
  );
}

/** Full-width main-bridge rows (check-in, keynote, lunch, closing…). */
function MainSessions({ seg, onSelect }: { seg: DaySegment; onSelect: (s: Session) => void }) {
  const sessions = (seg.sessionIds ?? [])
    .map((id) => sessionById(id))
    .filter((s): s is Session => Boolean(s))
    .sort((a, b) => a.start.localeCompare(b.start));
  return (
    <Reveal className="max-w-[860px] space-y-4" stagger={0.08}>
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} onSelect={onSelect} />
      ))}
    </Reveal>
  );
}

function ParallelBlock({ seg, filter, onSelect }: { seg: DaySegment; filter: ScheduleFilter; onSelect: (s: Session) => void }) {
  const tracks = filter === 'all' ? PARALLEL_TRACKS : PARALLEL_TRACKS.filter((t) => t.id === filter);
  const single = tracks.length === 1;
  return (
    <>
      {/* desktop: 多座桥时按时间对齐成一张网格；单座桥时整列铺开 */}
      <div className="hidden md:block">
        {single ? (
          <TrackColumn track={tracks[0]} slot={seg.slot ?? 'am'} wide onSelect={onSelect} />
        ) : (
          <TimeGrid tracks={tracks} slot={seg.slot ?? 'am'} onSelect={onSelect} />
        )}
      </div>
      {/* mobile: accordion grouped per forum (手风琴, one open at a time) */}
      <TrackAccordion className="md:hidden" tracks={tracks} slot={seg.slot ?? 'am'} onSelect={onSelect} />
    </>
  );
}

/** 一张卡：Workshop 按时段合并成分组卡，其余桥一场一张 SessionCard。 */
type Block = { key: string; start: string; end: string; node: (className?: string) => ReactNode };

function trackBlocks(track: Track, slot: 'am' | 'pm', onSelect: (s: Session) => void): Block[] {
  const sessions = sessionsByTrackSlot(track.id, slot);
  if (track.id === 'workshop') {
    let offset = 0;
    return groupByTime(sessions).map((g) => {
      const startIndex = offset;
      offset += g.length;
      return {
        key: g.map((s) => s.id).join('+'),
        start: g[0].start,
        end: g[0].end,
        node: (className) => <WorkshopGroup sessions={g} onSelect={onSelect} startIndex={startIndex} className={className} />,
      };
    });
  }
  return [...sessions]
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((s) => ({ key: s.id, start: s.start, end: s.end, node: (className) => <SessionCard session={s} onSelect={onSelect} className={className} /> }));
}

function TrackHeader({ track }: { track: Track }) {
  const locale = useLocale();
  return (
    <div className="overflow-hidden rounded-lg border-[3px] border-ink bg-white shadow-hard">
      <span className="block h-2 w-full" style={{ backgroundColor: track.color }} aria-hidden="true" />
      <div className="flex items-center justify-between gap-2 px-4 py-2.5">
        <span className="font-sans text-sm font-black text-ink">{pick(track.bridge, locale)}</span>
        <span className="font-mono text-[11px] font-medium tracking-[0.14em] text-ink/60">{track.no}</span>
      </div>
    </div>
  );
}

/**
 * 并行时段的时间网格：每个开始/结束时刻切一行，卡片按起止时间跨行，
 * 同一时刻的场次在各桥之间横向对齐，从上往下即时间顺序。
 */
function TimeGrid({ tracks, slot, onSelect }: { tracks: Track[]; slot: 'am' | 'pm'; onSelect: (s: Session) => void }) {
  const columns = tracks.map((t) => ({ track: t, blocks: trackBlocks(t, slot, onSelect) }));
  const times = [...new Set(columns.flatMap((c) => c.blocks.flatMap((b) => [b.start, b.end])))].sort();
  const row = (time: string) => times.indexOf(time) + 2; // 第 1 行是桥名表头
  return (
    <div
      className="grid gap-x-4 gap-y-3 lg:gap-x-5"
      style={{ gridTemplateColumns: `repeat(${tracks.length}, minmax(0, 1fr))` }}
    >
      {columns.map((c, i) => (
        <div key={c.track.id} className="mb-1" style={{ gridColumn: i + 1, gridRow: 1 }}>
          <TrackHeader track={c.track} />
        </div>
      ))}
      {columns.flatMap((c, i) => {
        // 列内时段有重叠（如两组 Workshop 13:30–16:00 与 15:00–17:00）：按时间顺序叠放在
        // 一个跨整段的格子里，避免卡片互相遮挡
        const overlaps = c.blocks.some((x, j) => c.blocks.some((y, k) => j !== k && x.start < y.end && y.start < x.end));
        if (overlaps) {
          const first = c.blocks.reduce((m, x) => (x.start < m ? x.start : m), c.blocks[0].start);
          const last = c.blocks.reduce((m, x) => (x.end > m ? x.end : m), c.blocks[0].end);
          return [
            <div key={c.track.id} className="flex min-w-0 flex-col gap-3" style={{ gridColumn: i + 1, gridRow: `${row(first)} / ${row(last)}` }}>
              {c.blocks.map((x) => (
                <div key={x.key}>{x.node()}</div>
              ))}
            </div>,
          ];
        }
        return c.blocks.map((x) => (
          <div key={x.key} className="min-w-0" style={{ gridColumn: i + 1, gridRow: `${row(x.start)} / ${row(x.end)}` }}>
            {x.node('h-full')}
          </div>
        ));
      })}
    </div>
  );
}

function TrackColumn({ track, slot, wide, onSelect }: { track: Track; slot: 'am' | 'pm'; wide: boolean; onSelect: (s: Session) => void }) {
  return (
    <div>
      <TrackHeader track={track} />
      <div className={cn('mt-4', wide ? 'grid gap-4 sm:grid-cols-2' : 'space-y-4')}>
        {trackBlocks(track, slot, onSelect).map((b) => (
          <div key={b.key}>{b.node()}</div>
        ))}
      </div>
    </div>
  );
}

function TrackAccordion({
  tracks,
  slot,
  onSelect,
  className,
}: {
  tracks: Track[];
  slot: 'am' | 'pm';
  onSelect: (s: Session) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(0);
  const locale = useLocale();
  return (
    <div className={cn('space-y-3', className)}>
      {tracks.map((t, i) => {
        const isOpen = open === i;
        const sessions = sessionsByTrackSlot(t.id, slot);
        return (
          <div key={t.id} className="overflow-hidden rounded-lg border-[3px] border-ink bg-white shadow-hard">
            <span className="block h-2 w-full" style={{ backgroundColor: t.color }} aria-hidden="true" />
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <span className="font-sans text-sm font-black text-ink">{pick(t.bridge, locale)}</span>
              <span className="font-mono text-[11px] tracking-[0.14em] text-ink/60">
                {t.no} · {sessions.length} SESSIONS
              </span>
              <motion.span
                className="ml-auto font-mono text-lg font-bold leading-none text-ink"
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: 0.2 }}
                aria-hidden="true"
              >
                +
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE_OUT }}
                  className="overflow-hidden"
                >
                  {/* 2px bridge line draws once at the top of the expanded area */}
                  <motion.span
                    className="mx-3 block h-[2px] origin-left bg-ink"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.15, ease: 'linear' }}
                    aria-hidden="true"
                  />
                  <div className="space-y-3 p-3">
                    {trackBlocks(t, slot, onSelect).map((b) => (
                      <div key={b.key}>{b.node()}</div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
