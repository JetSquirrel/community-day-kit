import { useRef, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { useLocale, pick } from '@/lib/locale';
import type { LText } from '@/lib/locale';

interface Node {
  year: string;
  theme: LText;
  desc: LText;
  /** year lights up in this color when the node passes viewport center */
  color: string;
}

/** past.md §S2 — every edition is a bridge; colors cycle pulse/bridge/spark/growth. */
const NODES: Node[] = [
  {
    year: '2023',
    theme: { zh: '第一次相聚', en: 'The First Gathering' },
    desc: {
      zh: '首届 Community Day 中国站，300+ 开发者挤满会场，User Group 社区正式成桥。',
      en: 'The first Community Day in China — 300+ developers packed the venue, and the User Group community officially became a bridge.',
    },
    color: '#6C3FD4',
  },
  {
    year: '2024',
    theme: { zh: '动手之年', en: 'The Year of Hands-On' },
    desc: {
      zh: 'Workshop 与 Hands-on Labs 成为标配，「带电脑来」写进了海报。',
      en: 'Workshops and Hands-on Labs became standard — "bring your laptop" made it onto the poster.',
    },
    color: '#2B5CE6',
  },
  {
    year: '2025',
    theme: { zh: '信号塔', en: 'The Signal Tower' },
    desc: {
      zh: '500+ 参会者，议题首次覆盖 AI 工程化，社区讲师团成立。',
      en: '500+ attendees; topics covered AI engineering for the first time, and the community speaker program was founded.',
    },
    color: '#FF4D3D',
  },
  {
    year: '2026.06',
    theme: { zh: 'Signal over Noise' },
    desc: {
      zh: '800+ 参会者、20+ 演讲、50万+ 曝光。我们在噪音里找到了信号。',
      en: '800+ attendees, 20+ talks, 500K+ impressions. We found the signal in the noise.',
    },
    color: '#2ECC71',
  },
];

function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onStoreChange);
      return () => mql.removeEventListener('change', onStoreChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** small arch icon that sits on the bridge line at each node */
function ArchIcon({ color, className }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 64 36" className={className} aria-hidden="true">
      <path d="M6 30 Q32 4 58 30" fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" />
      <circle cx="32" cy="30" r="5" fill={color} stroke="#141414" strokeWidth={2.5} />
    </svg>
  );
}

/** dashed tail pointing at the 2026.10 edition — shared by all variants */
function TailLabel() {
  const { t } = useTranslation('past');
  return <p className="font-mono text-xs font-medium tracking-[0.14em] text-ink/70">{t('timeline.tail')}</p>;
}

/** Desktop: pinned section, vertical scroll moves the bridge line sideways. */
function DesktopTimeline() {
  const locale = useLocale();
  const root = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const rootEl = root.current!;
      const trackEl = trackRef.current!;
      const dist = () => Math.max(0, trackEl.scrollWidth - rootEl.clientWidth);

      const tween = gsap.to(trackEl, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: {
          trigger: rootEl,
          start: 'top top',
          end: () => `+=${dist()}`,
          pin: true,
          scrub: 0.5,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // node lights up (scale 1.06 + year takes its color) near viewport center
      rootEl.querySelectorAll<HTMLElement>('[data-tl-node]').forEach((node) => {
        ScrollTrigger.create({
          trigger: node,
          containerAnimation: tween,
          start: 'center 60%',
          end: 'center 40%',
          onToggle: (self) => {
            gsap.to(node, { scale: self.isActive ? 1.06 : 1, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
            const year = node.querySelector('.tl-year');
            if (year) {
              gsap.to(year, { color: self.isActive ? (node.dataset.color ?? '#141414') : '#141414', duration: 0.3, overwrite: 'auto' });
            }
          },
        });
      });

      // the signal point at the dashed tail breathes while the tail is passing
      const dot = rootEl.querySelector<HTMLElement>('[data-tl-dot]')!;
      let breathe: gsap.core.Tween | null = null;
      ScrollTrigger.create({
        trigger: rootEl.querySelector('[data-tl-tail]')!,
        containerAnimation: tween,
        start: 'left 75%',
        onToggle: (self) => {
          if (self.isActive && !breathe) {
            breathe = gsap.to(dot, { scale: 1.8, opacity: 0.5, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
          } else if (!self.isActive && breathe) {
            breathe.kill();
            breathe = null;
            gsap.to(dot, { scale: 1, opacity: 1, duration: 0.25 });
          }
        },
      });

      // re-measure once the page-transition transform has settled
      const t = window.setTimeout(() => ScrollTrigger.refresh(), 500);
      return () => window.clearTimeout(t);
    },
    { scope: root },
  );

  return (
    <div ref={root} className="flex min-h-[100dvh] items-center overflow-hidden">
      <div ref={trackRef} className="relative flex w-max items-stretch pl-[calc(50vw-160px)]">
        {/* nodes on the solid bridge line */}
        <div className="relative flex items-stretch">
          <div className="absolute inset-x-0 top-1/2 h-[2px] bg-ink" aria-hidden="true" />
          {NODES.map((n, i) => (
            <div key={n.year} data-tl-node data-color={n.color} className="relative h-[460px] w-[320px] shrink-0 will-change-transform">
              <ArchIcon color={n.color} className="absolute left-[calc(50%-32px)] top-[calc(50%-18px)] h-9 w-16" />
              <div
                className="absolute inset-x-0 px-7"
                style={i % 2 === 0 ? { bottom: 'calc(50% + 46px)' } : { top: 'calc(50% + 46px)' }}
              >
                <p className="tl-year font-display text-[42px] leading-none text-ink">{n.year}</p>
                <p className="mt-2.5 font-sans text-xl font-black text-ink">{pick(n.theme, locale)}</p>
                <p className="mt-2 text-sm leading-[1.75] text-paper-dim">{pick(n.desc, locale)}</p>
              </div>
            </div>
          ))}
        </div>
        {/* dashed extension toward 2026.10 */}
        <div data-tl-tail className="relative w-[46vw] min-w-[440px] shrink-0">
          <div className="absolute left-[4%] right-[10%] top-1/2 border-t-[3px] border-dashed border-ink/60" aria-hidden="true" />
          <div className="absolute left-[8%] top-[calc(50%+30px)]">
            <TailLabel />
          </div>
          <span data-tl-dot className="absolute right-[10%] top-[calc(50%-6px)] h-3 w-3 rounded-full border-2 border-ink bg-pulse" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

/** Mobile: vertical timeline — spine draws with scroll, nodes pop in. */
function MobileTimeline() {
  const { t } = useTranslation('past');
  const locale = useLocale();
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from('[data-spine]', {
        scaleY: 0,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top 70%', end: 'bottom 55%', scrub: 0.5 },
      });
      root.current!.querySelectorAll('[data-mnode]').forEach((node) => {
        gsap.from(node, {
          y: 40,
          opacity: 0,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: { trigger: node, start: 'top 85%', once: true },
        });
      });
      // tail signal point starts breathing once scrolled into view
      gsap.to('[data-mdot]', {
        scale: 1.6,
        opacity: 0.55,
        duration: 0.55,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        scrollTrigger: { trigger: '[data-mdot]', start: 'top 85%' },
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="relative mx-auto max-w-[560px] px-6 py-20">
      <div data-spine className="absolute bottom-0 left-[45px] top-0 w-[2px] origin-top bg-ink" aria-hidden="true" />
      <div className="space-y-12">
        {NODES.map((n) => (
          <div key={n.year} data-mnode className="relative pl-20">
            <span className="absolute left-0 top-1 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-ink bg-white" aria-hidden="true">
              <ArchIcon color={n.color} className="h-4 w-7" />
            </span>
            <p className="font-display text-[34px] leading-none" style={{ color: n.color }}>
              {n.year}
            </p>
            <p className="mt-1.5 font-sans text-lg font-black text-ink">{pick(n.theme, locale)}</p>
            <p className="mt-2 text-sm leading-[1.75] text-paper-dim">{pick(n.desc, locale)}</p>
          </div>
        ))}
        {/* dashed tail → this edition */}
        <div data-mnode className="relative pl-20">
          <span className="absolute left-0 top-1 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-dashed border-ink bg-paper" aria-hidden="true">
            <span data-mdot className="h-3 w-3 rounded-full bg-pulse" />
          </span>
          <TailLabel />
          <p className="mt-1.5 font-sans text-lg font-black text-ink">{t('timeline.next')}</p>
        </div>
      </div>
    </div>
  );
}

/** prefers-reduced-motion: the same story as a static vertical list. */
function StaticTimeline() {
  const { t } = useTranslation('past');
  const locale = useLocale();
  return (
    <div className="relative mx-auto max-w-[560px] px-6 py-20">
      <div className="absolute bottom-0 left-[45px] top-0 w-[2px] bg-ink" aria-hidden="true" />
      <div className="space-y-12">
        {NODES.map((n) => (
          <div key={n.year} className="relative pl-20">
            <span className="absolute left-0 top-1 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-ink bg-white" aria-hidden="true">
              <ArchIcon color={n.color} className="h-4 w-7" />
            </span>
            <p className="font-display text-[34px] leading-none" style={{ color: n.color }}>
              {n.year}
            </p>
            <p className="mt-1.5 font-sans text-lg font-black text-ink">{pick(n.theme, locale)}</p>
            <p className="mt-2 text-sm leading-[1.75] text-paper-dim">{pick(n.desc, locale)}</p>
          </div>
        ))}
        <div className="relative pl-20">
          <span className="absolute left-0 top-1 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-dashed border-ink bg-paper" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-pulse" />
          </span>
          <TailLabel />
          <p className="mt-1.5 font-sans text-lg font-black text-ink">{t('timeline.next')}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * past.md §S2 — one bridge per edition along a horizontal bridge line.
 * Desktop pins + scrubs sideways; mobile degrades to a vertical timeline;
 * reduced motion gets the final state with no animation at all.
 */
export default function Timeline() {
  const { t } = useTranslation('past');
  const reduced = useMedia('(prefers-reduced-motion: reduce)');
  const isDesktop = useMedia('(min-width: 1024px)');

  return (
    <section className="bg-paper" aria-label={t('timeline.aria')}>
      {reduced ? <StaticTimeline /> : isDesktop ? <DesktopTimeline /> : <MobileTimeline />}
    </section>
  );
}
