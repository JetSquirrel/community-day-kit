import { useRef } from 'react';
import type { ReactNode } from 'react';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  /** mono kicker id, e.g. "SIG.02" */
  sig: string;
  /** mono kicker label, e.g. "TRACKS" */
  label: string;
  /** big mixed title: English display font + Chinese */
  title: ReactNode;
  /** optional one-line description (max ~480px) */
  sub?: string;
  /** accent square color before kicker */
  accent?: string;
  dark?: boolean;
  className?: string;
}

/**
 * Shared section header (design.md §5.6):
 * mono kicker with accent square → mixed huge title → optional sub.
 * Kicker wipes in from left, title rises, sub fades — once, on scroll into view.
 */
export default function SectionHeader({
  sig,
  label,
  title,
  sub,
  accent = '#6C3FD4',
  dark = false,
  className,
}: SectionHeaderProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const el = ref.current!;
      const kicker = el.querySelector('[data-kicker]');
      const titleEl = el.querySelector('[data-title]');
      const subEl = el.querySelector('[data-sub]');
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: 'top 80%', once: true },
      });
      tl.from(kicker, { clipPath: 'inset(0 100% 0 0)', duration: 0.4, ease: 'power2.out' })
        .from(titleEl, { y: 40, opacity: 0, duration: 0.7, ease: 'power3.out' }, '-=0.1');
      if (subEl) tl.from(subEl, { opacity: 0, y: 12, duration: 0.5 }, '-=0.3');
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={cn('max-w-[1280px]', className)}>
      <p
        data-kicker
        className={cn(
          'inline-flex items-center gap-2.5 font-mono text-[13px] font-medium uppercase tracking-[0.18em]',
          dark ? 'text-signal' : 'text-ink',
        )}
      >
        <span className="inline-block h-3 w-3 border-2 border-ink" style={{ backgroundColor: accent }} />
        {sig} // {label}
      </p>
      <h2
        data-title
        className={cn(
          'mt-4 font-sans text-[clamp(30px,5vw,64px)] font-black leading-[1.05] tracking-tight',
          dark ? 'text-signal' : 'text-ink',
        )}
      >
        {title}
      </h2>
      {sub ? (
        <p data-sub className={cn('mt-4 max-w-[480px] text-base leading-relaxed md:text-lg', dark ? 'text-paper/80' : 'text-paper-dim')}>
          {sub}
        </p>
      ) : null}
    </div>
  );
}
