import { useRef } from 'react';
import type { ReactNode } from 'react';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';

interface CompactHeroProps {
  /** mono kicker line, e.g. "AGENDA // 2026.10.17" */
  kicker: string;
  /** kicker square accent color */
  accent: string;
  /** English display title (Archivo Black) */
  titleEn: string;
  /** Chinese title (Noto Sans SC 900) */
  titleCn: string;
  sub: string;
  /** exactly one Memphis piece, absolutely positioned by the caller */
  memphis?: ReactNode;
  /** one right-side visual (desktop only) — the screen's single bridge moment */
  visual?: ReactNode;
}

/** 逐字入场动画的拆分；按空格分词，每个词整体不折行（否则会断成「on t / he」）。 */
function chars(text: string) {
  return text.split(' ').map((word, w) => (
    <span key={w}>
      {w > 0 && ' '}
      <span className="inline-block whitespace-nowrap">
        {Array.from(word).map((c, i) => (
          <span key={i} className="ph-char inline-block will-change-transform">
            {c}
          </span>
        ))}
      </span>
    </span>
  ));
}

/**
 * Compact yellow page hero (schedule.md S1 / speakers.md S1): 320px, 3px ink
 * bottom border. Entrance: kicker wipe → char-level title stagger (half the
 * home hero's amplitude) → sub fade. Runs once on mount (page top).
 */
export default function CompactHero({ kicker, accent, titleEn, titleCn, sub, memphis, visual }: CompactHeroProps) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('[data-ph-kicker]', { clipPath: 'inset(0 100% 0 0)', duration: 0.4, ease: 'power2.out' })
        .from('.ph-char', { y: 28, opacity: 0, duration: 0.6, stagger: 0.026 }, '-=0.05')
        .from('[data-ph-sub]', { y: 16, opacity: 0, duration: 0.5 }, '-=0.25');
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative overflow-hidden border-b-[3px] border-ink bg-signal">
      {memphis}
      <div className="mx-auto flex min-h-[320px] max-w-[1280px] items-center gap-10 px-6 py-10 xl:px-12">
        <div className="min-w-0 flex-1">
          <p
            data-ph-kicker
            className="inline-flex items-center gap-2.5 font-mono text-[13px] font-medium uppercase tracking-[0.18em] text-ink"
          >
            <span className="inline-block h-3 w-3 border-2 border-ink" style={{ backgroundColor: accent }} />
            {kicker}
          </p>
          <h1 className="mt-5 font-sans text-[clamp(40px,6vw,72px)] font-black leading-[1.02] tracking-tight text-ink">
            <span className="font-display">{chars(titleEn)}</span>
            <span className="mx-3 inline-block">·</span>
            <span>{chars(titleCn)}</span>
          </h1>
          <p data-ph-sub className="mt-4 max-w-[520px] text-base leading-[1.75] text-ink md:text-lg">
            {sub}
          </p>
        </div>
        {visual ? <div className="hidden shrink-0 lg:block">{visual}</div> : null}
      </div>
    </section>
  );
}
