import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import SectionHeader from '@/components/SectionHeader';
import CableCard from '@/components/CableCard';
import Memphis from '@/components/Memphis';
import { useLocale, pick } from '@/lib/locale';
import type { LText } from '@/lib/locale';

interface Stat {
  label: LText;
  value: number;
  /** en-only value override for when the suffix changes scale (万 → K) */
  valueEn?: number;
  suffix: LText;
  cn: LText;
}

/** past.md §S3 — cumulative 2023–2026 summer numbers. */
const STATS: Stat[] = [
  { label: { zh: 'TOTAL ATTENDEES' }, value: 800, suffix: { zh: '+' }, cn: { zh: '累计参会者', en: 'Total attendees' } },
  { label: { zh: 'TALKS' }, value: 60, suffix: { zh: '+' }, cn: { zh: '累计社区演讲', en: 'Community talks' } },
  { label: { zh: 'PARTNERS' }, value: 30, suffix: { zh: '+' }, cn: { zh: '合作社区与伙伴', en: 'Partner communities & orgs' } },
  { label: { zh: 'REACH' }, value: 50, valueEn: 500, suffix: { zh: '万+', en: 'K+' }, cn: { zh: '品牌曝光', en: 'Brand reach' } },
];

/** Signal Count + 4-bar strength meter (motion ⑤), same grammar as home S4. */
export default function PastStats() {
  const { t } = useTranslation('past');
  const locale = useLocale();
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from('.stat-card', {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: { trigger: root.current, start: 'top 75%', once: true },
      });
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
      <Memphis id="ring" className="pointer-events-none absolute bottom-10 right-[5%] h-16 w-20 max-md:h-12 max-md:w-16" />

      <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
        <SectionHeader sig="SIG.01" label="GROWTH" title={t('stats.title')} accent="#2B5CE6" />
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => {
            const value = locale === 'en' && s.valueEn ? s.valueEn : s.value;
            return (
              <CableCard key={s.label.zh} cable={false} className="stat-card p-6 pt-7">
                <p className="font-mono text-xs font-medium tracking-[0.18em] text-ink/70">{pick(s.label, locale)}</p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <p className="font-display text-[56px] leading-none text-ink md:text-[64px]">
                    <span className="stat-num" data-value={value}>
                      {value}
                    </span>
                    {pick(s.suffix, locale)}
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
            );
          })}
        </div>
        <p className="mt-8 font-mono text-xs tracking-[0.18em] text-ink/60">{t('stats.note')}</p>
      </div>
    </section>
  );
}
