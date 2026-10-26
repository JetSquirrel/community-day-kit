import { useRef } from 'react';
import type { ReactNode } from 'react';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** stagger between direct children (s) */
  stagger?: number;
  y?: number;
  /** animate the wrapper itself instead of its children */
  self?: boolean;
  delay?: number;
}

/**
 * One-shot scroll entrance: translateY + fade, power3.out,
 * triggered when the element enters the viewport at 20% (design.md §4 通用过渡).
 */
export default function Reveal({ children, className, stagger = 0.1, y = 40, self = false, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const el = ref.current!;
      const targets: Element[] = self ? [el] : Array.from(el.children);
      if (targets.length === 0) return;
      gsap.from(targets, {
        y,
        opacity: 0,
        duration: 0.8,
        delay,
        ease: 'power3.out',
        stagger,
        scrollTrigger: { trigger: el, start: 'top 80%', once: true },
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
