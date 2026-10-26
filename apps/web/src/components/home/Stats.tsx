import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { pick, useLocale } from '@/lib/locale';
import type { LText } from '@/lib/locale';
import SectionHeader from '@/components/SectionHeader';
import CableCard from '@/components/CableCard';
import Memphis from '@/components/Memphis';

const STATS: { label: string; value: number; suffix: string; cn: LText }[] = [
  { label: 'ATTENDEES', value: 600, suffix: '+', cn: { zh: '参会开发者', en: 'Developers Attending' } },
  { label: 'TALKS', value: 20, suffix: '+', cn: { zh: '场技术演讲', en: 'Tech Talks' } },
  { label: 'TRACKS', value: 4, suffix: '', cn: { zh: '大并行分论坛', en: 'Parallel Tracks' } },
  { label: 'HANDS-ON', value: 8, suffix: 'h', cn: { zh: '小时动手实验与市集', en: 'Hours of Hands-on Labs & Market' } },
];

/** S4 — the numbers: Signal Count + 4-bar strength meter (motion ⑤). */
export default function Stats() {
  const { t } = useTranslation('home');
  const locale = useLocale();
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      // cards entrance
      gsap.from('.stat-card', {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: { trigger: root.current, start: 'top 75%', once: true },
      });
      // signal count + bars light up
      const counters = gsap.utils.toArray<HTMLElement>('.stat-num');
      counters.forEach((el) => {
        const target = Number(el.dataset.value ?? '0');
        const state = { v: 0 };
        gsap.to(state, {
          v: target,
          duration: 1.2,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          onUpdate: () => {
            el.textContent = String(Math.round(state.v));
          },
        });
      });
      gsap.fromTo(
        '.stat-bar',
        { opacity: 0.12 },
        {
          opacity: 1,
          duration: 0.2,
          stagger: 0.15,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top 75%', once: true },
        },
      );
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative bg-signal py-24 md:py-28">
      {/* Memphis: exactly 1 piece */}
      <Memphis id="ring" className="pointer-events-none absolute right-[5%] top-10 h-16 w-20 max-md:h-12 max-md:w-16" />

      <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
        <SectionHeader sig="SIG.01" label="THE NUMBERS" title={t('stats.title')} />
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <CableCard key={s.label} cable={false} className="stat-card p-6 pt-7">
              <p className="font-mono text-xs font-medium tracking-[0.18em] text-ink/70">{s.label}</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="font-display text-[64px] leading-none text-ink md:text-[72px]">
                  <span className="stat-num" data-value={s.value}>
                    {s.value}
                  </span>
                  {s.suffix}
                </p>
                {/* 4-bar signal strength */}
                <span className="mb-1 flex items-end gap-1" aria-hidden="true">
                  {[16, 22, 28, 34].map((h) => (
                    <span key={h} className="stat-bar w-[9px] border-2 border-ink bg-pulse" style={{ height: `${h}px` }} />
                  ))}
                </span>
              </div>
              <p className="mt-3 font-sans text-[15px] font-medium text-paper-dim">{pick(s.cn, locale)}</p>
            </CableCard>
          ))}
        </div>
      </div>
    </section>
  );
}
