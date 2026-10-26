import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { pick, useLocale } from '@/lib/locale';
import type { LText } from '@/lib/locale';

const ACTS: { tag: string; title: LText; body: LText }[] = [
  {
    tag: 'ACT 01 // CONNECT',
    title: { zh: '立墩 · 连接', en: 'Setting Piers · Connect' },
    body: { zh: '桥墩立在两岸之间：人与技术，第一次相望。', en: 'Piers rise between the two shores: people and technology, seeing each other for the first time.' },
  },
  {
    tag: 'ACT 02 // TRANSMIT',
    title: { zh: '抛缆 · 传递', en: 'Throwing the Cable · Transmit' },
    body: { zh: '主缆跨过水面：价值信号开始传递。', en: 'The main cable crosses the water: the value signal begins its journey.' },
  },
  {
    tag: 'ACT 03 // CROSS',
    title: { zh: '合龙 · 跨越', en: 'Closing the Span · Cross' },
    body: { zh: '桥面合龙：从现在，走到未来。', en: 'The deck closes: from today, we walk into tomorrow.' },
  },
];

/** deck segments x positions (10 × 80px, gap ~9px, spanning 160..1041) */
const DECK_X = [160, 249, 338, 427, 516, 605, 694, 783, 872, 961];
const JOIN_IDX = 5; // 合龙段 — the closing segment drops in from above
/** 8 hangers: x + cable y (cable: M300 188 Q600 348 900 188 → y = 188 + 320·t·(1−t)) */
const HANGERS = [360, 430, 500, 570, 630, 700, 770, 840].map((x) => {
  const t = (x - 300) / 600;
  return { x, y: 188 + 320 * t * (1 - t) };
});

/**
 * S6 — The Bridge Builds Itself. The emotional peak: a pinned night scene
 * where scrolling assembles a suspension bridge in 3 acts, then the first
 * signal pulse crosses (motion ③). Reduced/mobile: finished bridge, acts stacked.
 */
export default function BridgeBuilder() {
  const { t } = useTranslation('home');
  const locale = useLocale();
  const root = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const reduced = useMemo(() => prefersReducedMotion(), []);

  useGSAP(
    () => {
      if (reduced) return;
      const mm = gsap.matchMedia();
      mm.add('(min-width: 1024px)', () => {
        const tl = gsap.timeline({
          defaults: { ease: 'power2.out' },
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: '+=200%',
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            onUpdate: (self) => {
              const p = Math.round(self.progress * 100);
              if (barRef.current) barRef.current.style.transform = `scaleX(${self.progress})`;
              if (pctRef.current)
                pctRef.current.textContent = self.progress >= 0.995 ? '100% · COMPLETE' : `BUILDING… ${p}%`;
            },
          },
        });

        // ---------- ACT 1 (0 → 0.3): towers rise ----------
        tl.set('.bb-copy', { opacity: 0 }, 0);
        tl.from('.bb-tower', { y: 300, duration: 0.26, stagger: 0.04 }, 0.01);
        tl.fromTo('.bb-copy-1', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.1 }, 0.05);

        // ---------- ACT 2 (0.33 → 0.62): cable thrown, hangers drop ----------
        tl.to('.bb-copy-1', { opacity: 0, y: -24, duration: 0.05 }, 0.31);
        tl.fromTo('.bb-copy-2', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.08 }, 0.36);
        tl.fromTo(
          '.bb-cable',
          { strokeDasharray: 1400, strokeDashoffset: 1400 },
          { strokeDashoffset: 0, duration: 0.22, ease: 'power1.inOut' },
          0.34,
        );
        tl.from('.bb-hanger', { scaleY: 0, transformOrigin: '50% 0%', duration: 0.1, stagger: 0.014, ease: 'power1.out' }, 0.5);

        // ---------- ACT 3 (0.64 → 0.92): deck segments join ----------
        tl.to('.bb-copy-2', { opacity: 0, y: -24, duration: 0.05 }, 0.62);
        tl.fromTo('.bb-copy-3', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.08 }, 0.67);
        tl.from(
          '.bb-seg-side',
          {
            x: (_i, el) => ((el as SVGElement).dataset.side === 'l' ? -90 : 90),
            opacity: 0,
            duration: 0.16,
            stagger: { each: 0.016, from: 'edges' },
            ease: 'power1.out',
          },
          0.66,
        );
        // closing segment drops in with a soft bounce
        tl.from('.bb-seg-join', { y: -300, opacity: 0, duration: 0.09, ease: 'back.out(2)' }, 0.86);

        // ---------- 0.93 → 1: first signal crosses ----------
        tl.fromTo('.bb-pulse', { opacity: 0, attr: { cx: 160 } }, { opacity: 1, attr: { cx: 1040 }, duration: 0.06, ease: 'none' }, 0.935);
        tl.to('.bb-svg', { filter: 'brightness(1.3)', duration: 0.03, yoyo: true, repeat: 1, ease: 'none' }, 0.93);

        return () => {
          if (barRef.current) barRef.current.style.transform = '';
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative overflow-hidden border-y-[3px] border-ink" style={{ background: 'radial-gradient(ellipse 90% 70% at 50% 62%, #1a1a14 0%, #141414 75%)' }}>
      <div className="mx-auto flex min-h-[100dvh] max-w-[1280px] flex-col justify-center px-6 py-16 xl:px-12">
        {/* act copies — same spot on desktop, stacked on mobile */}
        <div className="flex flex-col gap-10 text-center lg:relative lg:block lg:h-[150px]">
          {ACTS.map((a, i) => (
            <div key={a.tag} className={`bb-copy bb-copy-${i + 1} lg:absolute lg:inset-x-0 lg:top-0`}>
              <p className="font-mono text-[13px] font-medium uppercase tracking-[0.18em] text-signal/80">{a.tag}</p>
              <h2 className="mt-3 font-sans text-[clamp(34px,4.5vw,56px)] font-black leading-none text-signal">{pick(a.title, locale)}</h2>
              <p className="mt-3 text-base text-paper/70 md:text-lg">{pick(a.body, locale)}</p>
            </div>
          ))}
        </div>

        {/* the bridge — yellow line art on night ink */}
        <svg viewBox="0 0 1200 600" className="bb-svg mx-auto mt-6 w-full max-w-[1000px]" role="img" aria-label={t('bridge.ariaLabel')}>
          {/* banks */}
          <path d="M40 462 H160 M1040 462 H1160" stroke="#FFD900" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6" />
          {/* water */}
          <path d="M470 530 q20 -12 40 0 t40 0 M650 548 q20 -12 40 0 t40 0" stroke="#FFD900" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.35" />

          {/* towers */}
          <g className="bb-tower" stroke="#FFD900" strokeWidth="3" fill="none">
            <rect x="280" y="180" width="14" height="280" />
            <rect x="306" y="180" width="14" height="280" />
            <rect x="272" y="172" width="56" height="12" />
            <rect x="272" y="300" width="56" height="10" />
          </g>
          <g className="bb-tower" stroke="#FFD900" strokeWidth="3" fill="none">
            <rect x="880" y="180" width="14" height="280" />
            <rect x="906" y="180" width="14" height="280" />
            <rect x="872" y="172" width="56" height="12" />
            <rect x="872" y="300" width="56" height="10" />
          </g>

          {/* main cable */}
          <path className="bb-cable" d="M120 230 L300 188 Q600 348 900 188 L1080 230" stroke="#FFD900" strokeWidth="3" fill="none" strokeLinecap="round" />

          {/* hangers */}
          {HANGERS.map((h) => (
            <line key={h.x} className="bb-hanger" x1={h.x} y1={h.y} x2={h.x} y2={420} stroke="#FFD900" strokeWidth="2.5" />
          ))}

          {/* deck segments */}
          {DECK_X.map((x, i) =>
            i === JOIN_IDX ? (
              <rect key={x} className="bb-seg-join" x={x} y={420} width={80} height={24} stroke="#FFD900" strokeWidth="3" fill="none" />
            ) : (
              <rect
                key={x}
                className="bb-seg-side"
                data-side={i < JOIN_IDX ? 'l' : 'r'}
                x={x}
                y={420}
                width={80}
                height={24}
                stroke="#FFD900"
                strokeWidth="3"
                fill="none"
              />
            ),
          )}

          {/* first signal */}
          <circle className="bb-pulse" cx={160} cy={412} r={8} fill="#6C3FD4" stroke="#FFD900" strokeWidth="2" opacity={0} />
        </svg>

        {/* build progress */}
        <div className="mt-8 hidden items-center justify-center gap-4 lg:flex" aria-hidden="true">
          <span className="h-[3px] w-[200px] origin-left bg-paper/15">
            <span ref={barRef} className="block h-full w-full origin-left bg-signal" style={{ transform: 'scaleX(0)' }} />
          </span>
          <span ref={pctRef} className="font-mono text-xs tracking-[0.18em] text-signal/80">
            BUILDING… 0%
          </span>
        </div>

        <p className="mt-6 font-mono text-[11px] tracking-[0.18em] text-paper/40 lg:absolute lg:bottom-8 lg:left-12">
          {t('bridge.caption')}
        </p>
      </div>
    </section>
  );
}
