import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { pick, useLocale, useLocalePath } from '@/lib/locale';
import type { LText } from '@/lib/locale';
import SectionHeader from '@/components/SectionHeader';
import Memphis from '@/components/Memphis';
import { GhostLink } from '@/components/Button';
import { cn } from '@/lib/utils';

const ITEMS: { time: string; title: LText; tag: string }[] = [
  { time: '08:30', title: { zh: '签到入场 · 领取胸牌与周边', en: 'Check-in · Pick up your badge & swag' }, tag: 'SOCIAL' },
  { time: '09:30', title: { zh: '开幕 Keynote · 主桥通车（主会场）', en: 'Opening Keynote · Main bridge opens (Main Hall)' }, tag: 'KEYNOTE' },
  { time: '10:30', title: { zh: '上午分论坛 · 四座桥同时开桥', en: 'Morning tracks · All four bridges open' }, tag: 'TRACK' },
  { time: '12:00', title: { zh: '午餐 & 开发者市集', en: 'Lunch & Developer Market' }, tag: 'BREAK' },
  { time: '13:30', title: { zh: '下午分论坛 & Hands-on Labs', en: 'Afternoon tracks & Hands-on Labs' }, tag: 'TRACK' },
  { time: '16:40', title: { zh: '闭幕 · 在桥上合影', en: 'Closing · Group photo on the bridge' }, tag: 'SOCIAL' },
];

const TAG_COLORS: Record<string, string> = {
  KEYNOTE: 'bg-ink text-signal',
  TRACK: 'bg-pulse text-white',
  BREAK: 'bg-paper text-ink',
  SOCIAL: 'bg-growth text-ink',
};

/**
 * S8 — one day's crossing route. The spine draws itself with scroll (桥面延伸),
 * pier dots pop in, entry cards slide from the right.
 */
export default function AgendaPreview() {
  const { t } = useTranslation('home');
  const locale = useLocale();
  const lp = useLocalePath();
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      // spine draws top → bottom with scroll
      gsap.from('.ag-spine-fill', {
        scaleY: 0,
        transformOrigin: '50% 0%',
        ease: 'none',
        scrollTrigger: { trigger: '.ag-list', start: 'top 75%', end: 'bottom 60%', scrub: 0.4 },
      });
      // pier dots pop in
      gsap.from('.ag-pier', {
        scale: 0,
        transformOrigin: '50% 50%',
        ease: 'back.out(3)',
        duration: 0.4,
        stagger: 0.12,
        scrollTrigger: { trigger: '.ag-list', start: 'top 70%', once: true },
      });
      // cards slide in from the right
      gsap.from('.ag-item', {
        x: 24,
        opacity: 0,
        duration: 0.6,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: { trigger: '.ag-list', start: 'top 75%', once: true },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative bg-signal py-24 md:py-32">
      {/* Memphis: exactly 1 piece */}
      <Memphis id="wave-2" className="pointer-events-none absolute bottom-12 right-[6%] h-12 w-20 max-md:h-9 max-md:w-14" />

      <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeader sig="SIG.04" label="AGENDA" title={t('agenda.title')} accent="#FF4D3D" />
          <GhostLink to={lp('/schedule')} className="mb-1">
            {t('agenda.fullSchedule')}
          </GhostLink>
        </div>

        <div className="ag-list relative mt-12 max-w-[760px]">
          {/* spine */}
          <span className="absolute bottom-4 left-[52px] top-4 w-[2px] bg-ink/15" aria-hidden="true">
            <span className="ag-spine-fill block h-full w-full bg-ink" />
          </span>

          <ol className="space-y-5">
            {ITEMS.map((it) => (
              <li key={it.time} className="group relative flex items-center gap-5">
                <span className="w-[38px] shrink-0 text-right font-mono text-[15px] font-medium text-ink">{it.time}</span>
                {/* pier dot */}
                <span
                  className={cn(
                    'ag-pier z-10 h-4 w-4 shrink-0 rounded-full border-[3px] border-ink bg-signal transition-colors duration-200 group-hover:bg-pulse',
                  )}
                  aria-hidden="true"
                />
                <div className="ag-item flex flex-1 flex-wrap items-center justify-between gap-3 rounded-lg border-[3px] border-ink bg-white px-5 py-3.5 shadow-hard-sm transition-[transform,box-shadow] duration-200 group-hover:-translate-y-[3px] group-hover:shadow-hard">
                  <span className="font-sans font-bold text-ink">{pick(it.title, locale)}</span>
                  <span className={cn('rounded-full border-2 border-ink px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-wider', TAG_COLORS[it.tag])}>
                    {it.tag}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
