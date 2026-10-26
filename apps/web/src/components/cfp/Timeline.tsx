import { useRef } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import SectionHeader from '@/components/SectionHeader';
import { PulseRing } from '@/components/cfp/SignalBits';
import { pick, useLocale } from '@/lib/locale';
import type { LText } from '@/lib/locale';
import { cn } from '@/lib/utils';

const MILESTONES: { date: string; title: LText; desc: LText; current: boolean; deadline?: boolean }[] = [
  { date: '07.23', title: { zh: '征稿开启', en: 'CFP Opens' }, desc: { zh: '信号接入', en: 'Signal connected' }, current: false },
  { date: '08.31', title: { zh: '投稿截止', en: 'Submission Deadline' }, desc: { zh: '桥面合龙', en: 'Bridge deck joined' }, current: true, deadline: true },
  { date: '10.17', title: { zh: '大会当天', en: 'Event Day' }, desc: { zh: '正式过桥', en: 'The official crossing' }, current: false },
];

function NodeDot({ current }: { current: boolean }) {
  return (
    <span
      className={cn(
        'tl-dot relative block h-3 w-3 shrink-0 rounded-full',
        current ? 'border-[3px] border-signal bg-signal' : 'border-[3px] border-signal bg-transparent',
      )}
    >
      {current && <PulseRing />}
    </span>
  );
}

/**
 * CFP S4 — 建桥时刻表 (ink band, no Memphis). The yellow bridge line draws
 * left→right with scroll scrub; nodes pop in back.out(3) staggered 0.12s;
 * the current stage (投稿截止 — CFP 已关闭) carries the Pulse Purple breathing ring.
 */
export default function Timeline() {
  const root = useRef<HTMLElement>(null);
  const locale = useLocale();
  const { t } = useTranslation('cfp');

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      // bridge line draws with scroll — horizontal (desktop) & vertical (mobile)
      gsap.from('.tl-line-h', {
        scaleX: 0,
        transformOrigin: '0% 50%',
        ease: 'none',
        scrollTrigger: { trigger: '.tl-track-h', start: 'top 82%', end: 'bottom 55%', scrub: 0.4 },
      });
      gsap.from('.tl-line-v', {
        scaleY: 0,
        transformOrigin: '50% 0%',
        ease: 'none',
        scrollTrigger: { trigger: '.tl-track-v', start: 'top 82%', end: 'bottom 60%', scrub: 0.4 },
      });
      // nodes pop in
      gsap.from('.tl-dot', {
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

  return (
    <section ref={root} className="bg-ink py-24 md:py-28">
      <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
        <SectionHeader sig="SIG.02" label={t('timeline.label')} title={t('timeline.title')} accent="#FFD900" dark />

        {/* desktop: horizontal bridge line */}
        <div className="tl-track-h relative mt-16 hidden md:block">
          <span className="absolute left-[10%] right-[10%] top-[5px] h-[2px] bg-signal/25" aria-hidden="true">
            <span className="tl-line-h block h-full w-full bg-signal" />
          </span>
          <ol className="grid grid-cols-3 gap-6">
            {MILESTONES.map((m) => (
              <li key={m.date} className="flex flex-col items-center text-center">
                <NodeDot current={m.current} />
                <p className="mt-5 font-mono text-base font-medium tracking-wider text-signal">
                  {m.deadline ? (
                    /* hand-drawn deadline note; extra gap lifts the label clear of the bridge line */
                    <span className="ann ann-s ann-on-ink" data-note={t('timeline.deadlineNote')} style={{ '--ann-target-gap': '26px' } as CSSProperties}>
                      {m.date}
                    </span>
                  ) : (
                    m.date
                  )}
                </p>
                <p className="mt-1.5 font-sans text-lg font-bold text-white">{pick(m.title, locale)}</p>
                <p className="mt-1 text-sm text-white/60">{pick(m.desc, locale)}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* mobile: vertical bridge line */}
        <div className="tl-track-v relative mt-12 md:hidden">
          <span className="absolute bottom-2 left-[5px] top-2 w-[2px] bg-signal/25" aria-hidden="true">
            <span className="tl-line-v block h-full w-full bg-signal" />
          </span>
          <ol className="space-y-8">
            {MILESTONES.map((m) => (
              <li key={m.date} className="relative flex items-start gap-5">
                <span className="mt-1.5 block">
                  <NodeDot current={m.current} />
                </span>
                <div>
                  <p className="font-mono text-base font-medium tracking-wider text-signal">
                    {m.deadline ? (
                      /* hand-drawn deadline note; label sits in the empty space right of the date */
                      <span className="ann ann-w ann-on-ink" data-note={t('timeline.deadlineNote')}>
                        {m.date}
                      </span>
                    ) : (
                      m.date
                    )}
                  </p>
                  <p className="mt-1 font-sans text-lg font-bold text-white">
                    {pick(m.title, locale)} <span className="ml-1 text-sm font-normal text-white/60">— {pick(m.desc, locale)}</span>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
