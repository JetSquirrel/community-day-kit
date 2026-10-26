import Reveal from '@/components/Reveal';
import SessionCard from './SessionCard';
import { pick, useLocale } from '@/lib/locale';
import { TRACKS, sessionsByTrack } from './data';
import type { ScheduleFilter } from './TimelineView';
import type { Session } from './data';

interface TracksViewProps {
  filter: ScheduleFilter;
  onSelect: (session: Session) => void;
}

/**
 * 分轨视图 (schedule.md S2 view toggle) — one section per bridge: 8px track
 * color bar + bridge name + TRACK ordinal, with all of its sessions in a grid.
 */
export default function TracksView({ filter, onSelect }: TracksViewProps) {
  const locale = useLocale();
  const tracks = filter === 'all' ? TRACKS : TRACKS.filter((t) => t.id === filter);
  return (
    <Reveal className="space-y-8" stagger={0.1}>
      {tracks.map((t) => {
        const sessions = sessionsByTrack(t.id);
        return (
          <section key={t.id} className="overflow-hidden rounded-lg border-[3px] border-ink bg-white shadow-hard-lg">
            <span className="block h-2 w-full" style={{ backgroundColor: t.color }} aria-hidden="true" />
            <div className="p-6 md:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="font-sans text-2xl font-black text-ink">
                  {pick(t.bridge, locale)}
                  <span className="ml-3 font-mono text-sm font-medium uppercase tracking-[0.14em] text-ink/50">{t.signal}</span>
                </h3>
                <span className="font-mono text-xs font-medium tracking-[0.14em] text-ink/60">
                  {t.no} · {sessions.length} SESSIONS
                </span>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sessions.map((s) => (
                  <SessionCard key={s.id} session={s} onSelect={onSelect} />
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </Reveal>
  );
}
