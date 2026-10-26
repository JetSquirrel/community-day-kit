import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import CompactHero from '@/components/schedule/CompactHero';
import FilterBar from '@/components/schedule/FilterBar';
import type { FilterPill } from '@/components/schedule/FilterBar';
import TimelineView from '@/components/schedule/TimelineView';
import TracksView from '@/components/schedule/TracksView';
import SessionModal from '@/components/schedule/SessionModal';
import Memphis from '@/components/Memphis';
import Button from '@/components/Button';
import { cn } from '@/lib/utils';
import { EASE_OUT, gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { useSessions } from '@/lib/content';
import { TRACKS } from '@/components/schedule/data';
import type { Session, TrackId } from '@/components/schedule/data';
import { pick, useLocale } from '@/lib/locale';
import { SITE } from '@/lib/site';

type Filter = TrackId | 'all';
type View = 'timeline' | 'tracks';

const SHORT: Record<TrackId, string> = { keynote: 'Keynote', ai: '', builder: '', spark: 'Spark', global: 'Global', workshop: '' };

/**
 * 日程安排 /schedule (schedule.md): yellow compact hero → sticky track filter
 * (supports ?track=ai|global|spark|workshop deep links) → bridge-deck timeline
 * or by-track view → session detail modal → yellow CTA band → Footer.
 * Paper ground throughout; one Memphis piece in the hero only.
 */
export default function Schedule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const locale = useLocale();
  const { t } = useTranslation('schedule');
  const param = searchParams.get('track');
  // the filter lives in the URL — shareable, and honors ?track= deep links
  const filter: Filter = param && TRACKS.some((tr) => tr.id === param) ? (param as Filter) : 'all';
  // live sessions: bundled schedule first, hot-swapped with the derived timetable
  const sessions = useSessions();

  // filter pills resolve bridge names per locale (module-level const can't)
  const pills = useMemo<FilterPill[]>(
    () => [
      { id: 'all', label: t('filter.all'), color: '#141414', textOn: '#FFD900', dot: '#FFD900' },
      ...TRACKS.map((track) => ({
        id: track.id,
        label: track.id === 'keynote' ? t('filter.keynoteBridge') : `${pick(track.bridge, locale)} ${SHORT[track.id]}`.trim(),
        color: track.color,
        textOn: track.textOn,
        dot: track.color,
      })),
    ],
    [locale, t],
  );

  const [view, setView] = useState<View>('timeline');
  const [selected, setSelected] = useState<Session | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const changeFilter = (id: string) => {
    setSearchParams(id === 'all' ? {} : { track: id }, { replace: true });
  };

  const openSession = (s: Session) => {
    setSelected(s);
    setModalOpen(true);
  };

  const count = useMemo(
    () => (filter === 'all' ? sessions.length : sessions.filter((s) => s.track === filter).length),
    [filter, sessions],
  );

  return (
    <>
      <CompactHero
        kicker={`AGENDA // ${SITE.date}`}
        accent="#FF4D3D"
        titleEn="Schedule"
        titleCn="日程安排"
        sub={t('hero.sub')}
        memphis={
          <Memphis id="wave-1" className="pointer-events-none absolute left-[4%] top-8 h-12 w-20 max-md:h-9 max-md:w-14" />
        }
        visual={<MiniArch />}
      />

      <FilterBar
        pills={pills}
        active={filter}
        onChange={changeFilter}
        right={
          <>
            <div className="inline-flex rounded-full border-[3px] border-ink bg-white p-[3px]" role="group" aria-label={t('view.switchAria')}>
              {(['timeline', 'tracks'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  className={cn(
                    'rounded-full px-3 py-1 font-mono text-xs font-medium tracking-wider transition-colors duration-150',
                    view === v ? 'bg-ink text-signal' : 'text-ink hover:bg-signal/50',
                  )}
                >
                  {v === 'timeline' ? t('view.timeline') : t('view.tracks')}
                </button>
              ))}
            </div>
            <span className="font-mono text-xs font-medium tracking-[0.14em] text-ink/70">{count} SESSIONS</span>
          </>
        }
      />

      <section className="bg-paper py-14 md:py-20">
        <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${view}-${filter}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.18 } }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
            >
              {view === 'timeline' ? (
                <TimelineView filter={filter} onSelect={openSession} />
              ) : (
                <TracksView filter={filter} onSelect={openSession} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {SITE.registerUrl && <CtaBand />}
      <SessionModal session={selected} open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

/**
 * The hero's single bridge moment: divider-arch.svg redrawn inline (200px) so
 * its stroke can draw itself 300ms in, with one resident Signal Pulse dot
 * looping across the arch (motion ①).
 */
function MiniArch() {
  const ref = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion() || !ref.current) return;
      ref.current.querySelectorAll('[data-arch]').forEach((p) => {
        const path = p as SVGPathElement;
        const len = path.getTotalLength();
        gsap.fromTo(
          path,
          { strokeDasharray: len, strokeDashoffset: len },
          { strokeDashoffset: 0, duration: 1, delay: 0.3, ease: 'power2.out' },
        );
      });
    },
    { scope: ref },
  );

  return (
    <svg ref={ref} viewBox="0 0 240 110" className="w-[200px]" aria-hidden="true" focusable="false">
      <style>{'@media (prefers-reduced-motion: reduce){.pulse{display:none}}'}</style>
      <path data-arch d="M16 64 H76" fill="none" stroke="#141414" strokeWidth="3" strokeLinecap="round" />
      <path data-arch d="M164 64 H224" fill="none" stroke="#141414" strokeWidth="3" strokeLinecap="round" />
      <path data-arch d="M76 64 Q120 12 164 64" fill="none" stroke="#141414" strokeWidth="3" strokeLinecap="round" />
      <path data-arch d="M96 88 q10 -7 20 0 t20 0" fill="none" stroke="#141414" strokeWidth="3" strokeLinecap="round" />
      <path data-arch d="M132 96 q10 -7 20 0 t20 0" fill="none" stroke="#141414" strokeWidth="3" strokeLinecap="round" />
      <circle className="pulse" r="6" fill="#6C3FD4" stroke="#141414" strokeWidth="2.5">
        <animateMotion dur="3.5s" repeatCount="indefinite" path="M16 64 H76 Q120 12 164 64 H224" />
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="3.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/**
 * S5 bottom band (yellow, 240px): 还没报名？ + 立即报名 | CFP 同步开放.
 * Entrance: title/buttons pop, the 3px bridge line draws along the bottom edge
 * and one signal dot crosses it once (motion ①, one-shot).
 */
function CtaBand() {
  const root = useRef<HTMLElement>(null);
  const { t } = useTranslation('schedule');

  useGSAP(
    () => {
      if (prefersReducedMotion() || !root.current) return;
      const line = root.current.querySelector('[data-cta-line]') as HTMLElement;
      const dot = root.current.querySelector('[data-cta-dot]') as HTMLElement;
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: { trigger: root.current, start: 'top 80%', once: true },
      });
      tl.from('[data-cta-title]', { y: 28, opacity: 0, duration: 0.6 })
        .from('[data-cta-right]', { y: 20, opacity: 0, duration: 0.5 }, '-=0.35')
        .from('[data-cta-btn]', { scale: 0.85, opacity: 0, duration: 0.5, ease: 'back.out(1.7)' }, '-=0.25')
        .fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'power2.out' }, '-=0.2')
        .fromTo(dot, { opacity: 0 }, { opacity: 1, duration: 0.15 }, '-=0.1')
        .fromTo(dot, { x: 0 }, { x: () => Math.max(line.clientWidth - 12, 0), duration: 1.6, ease: 'power1.inOut' }, '<')
        .to(dot, { opacity: 0, duration: 0.25 }, '-=0.25');
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative overflow-hidden border-t-[3px] border-ink bg-signal">
      <div className="mx-auto flex min-h-[240px] max-w-[1280px] flex-col justify-center gap-8 px-6 py-12 md:flex-row md:items-center md:justify-between xl:px-12">
        <div>
          <h3 data-cta-title className="font-sans text-3xl font-black text-ink md:text-4xl">
            {t('cta.title')}
          </h3>
          {SITE.registerUrl && (
            <div data-cta-btn className="mt-5">
              <Button variant="primary" href={SITE.registerUrl}>
                {t('common:common.register')} · {t('common:site.dateChip')}
              </Button>
            </div>
          )}
        </div>
      </div>
      {/* bridge line along the band's bottom edge + one signal crossing, once */}
      <div className="absolute inset-x-0 bottom-0" aria-hidden="true">
        <span data-cta-line className="block h-[3px] w-full origin-left bg-ink" />
        <span data-cta-dot className="absolute bottom-[-4.5px] left-0 h-3 w-3 rounded-full border-2 border-ink bg-pulse opacity-0" />
      </div>
    </section>
  );
}
