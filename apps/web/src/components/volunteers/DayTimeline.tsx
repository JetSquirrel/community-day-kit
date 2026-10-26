import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import SectionHeader from '@/components/SectionHeader';
import { pick, useLocale, type LText } from '@/lib/locale';

interface DayEntry {
  time: string;
  title: LText;
  tag: string;
}

const DAY: DayEntry[] = [
  { time: '07:30', title: { zh: '集合布场 · 桥上点灯', en: 'Muster & setup · Lighting up the bridge' }, tag: 'PREP' },
  { time: '08:30', title: { zh: '签到高峰 · 第一波过桥', en: 'Check-in peak · First crossing wave' }, tag: 'PEAK' },
  { time: '09:30', title: { zh: 'Keynote 保障 · 主桥通行', en: 'Keynote support · Main bridge open' }, tag: 'KEYNOTE' },
  { time: '12:00', title: { zh: '轮岗午餐', en: 'Rotating lunch break' }, tag: 'BREAK' },
  { time: '13:30', title: { zh: '下午分论坛保障', en: 'Afternoon breakout support' }, tag: 'TRACKS' },
  { time: '16:40', title: { zh: '闭幕合影 · 守桥人全家福', en: 'Closing group photo · The Keeper family portrait' }, tag: 'FINALE' },
  { time: '17:30', title: { zh: '撤场收桥 · 庆功聚餐', en: 'Teardown & bridge folding · Celebration dinner' }, tag: 'AFTER' },
];

/**
 * Volunteers S4 — a keeper's day (paper, no Memphis). Same grammar as the
 * home agenda spine: the spine draws itself with scroll, pier dots pop in,
 * entries slide from the right.
 */
export default function DayTimeline() {
  const { t } = useTranslation('volunteers');
  const locale = useLocale();
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from('.vd-spine-fill', {
        scaleY: 0,
        transformOrigin: '50% 0%',
        ease: 'none',
        scrollTrigger: { trigger: '.vd-list', start: 'top 75%', end: 'bottom 60%', scrub: 0.4 },
      });
      gsap.from('.vd-pier', {
        scale: 0,
        transformOrigin: '50% 50%',
        ease: 'back.out(3)',
        duration: 0.4,
        stagger: 0.12,
        scrollTrigger: { trigger: '.vd-list', start: 'top 70%', once: true },
      });
      gsap.from('.vd-item', {
        x: 24,
        opacity: 0,
        duration: 0.6,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: { trigger: '.vd-list', start: 'top 75%', once: true },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="bg-paper py-24 md:py-28">
      <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
        <SectionHeader sig="SIG.03" label="THE DAY" title={t('day.title')} accent="#FF4D3D" />

        <div className="vd-list relative mt-12 max-w-[720px]">
          {/* spine */}
          <span className="absolute bottom-4 left-[52px] top-4 w-[2px] bg-ink/15" aria-hidden="true">
            <span className="vd-spine-fill block h-full w-full bg-ink" />
          </span>

          <ol className="space-y-5">
            {DAY.map((it) => (
              <li key={it.time} className="group relative flex items-center gap-5">
                <span className="w-[38px] shrink-0 text-right font-mono text-[15px] font-medium text-ink">{it.time}</span>
                {/* pier dot */}
                <span
                  className="vd-pier z-10 h-4 w-4 shrink-0 rounded-full border-[3px] border-ink bg-white transition-colors duration-200 group-hover:bg-pulse"
                  aria-hidden="true"
                />
                <div className="vd-item flex flex-1 flex-wrap items-center justify-between gap-3 rounded-lg border-[3px] border-ink bg-white px-5 py-3.5 shadow-hard-sm transition-[transform,box-shadow] duration-200 group-hover:-translate-y-[3px] group-hover:shadow-hard">
                  <span className="font-sans font-bold text-ink">{pick(it.title, locale)}</span>
                  <span className="rounded-full border-2 border-ink bg-paper px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-wider text-ink">
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
