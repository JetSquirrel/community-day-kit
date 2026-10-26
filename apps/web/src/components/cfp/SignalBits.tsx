import { memo } from 'react';
import { motion } from 'framer-motion';
import { prefersReducedMotion } from '@/lib/gsap';
import { cn } from '@/lib/utils';

/**
 * Small animated bits shared by the CFP and Volunteers pages (both in this
 * agent's scope). Perpetual loops are isolated in memo'd micro-components
 * (react-dev.md: Perpetual Animation Isolation).
 */

/** 8px green breathing dot — "channel open" status, 2s loop. */
export const BreathingDot = memo(function BreathingDot({ className }: { className?: string }) {
  const cls = cn('inline-block h-2 w-2 shrink-0 rounded-full border border-ink bg-growth', className);
  if (prefersReducedMotion()) return <span className={cls} aria-hidden="true" />;
  return (
    <motion.span
      aria-hidden="true"
      className={cls}
      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.55, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
});

/** Pulse Purple breathing ring around the current timeline node, 2s loop. */
export const PulseRing = memo(function PulseRing() {
  if (prefersReducedMotion()) return null;
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute -inset-[3px] rounded-full border-[3px] border-pulse"
      animate={{ scale: [1, 2.1], opacity: [0.9, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
    />
  );
});

/** Ink-outlined white speech bubble with a small tail (mono text inside). */
export function SpeechBubble({ text, className }: { text: string; className?: string }) {
  return (
    <div
      className={cn(
        'relative inline-block whitespace-nowrap rounded-lg border-[3px] border-ink bg-white px-3.5 py-2',
        'font-mono text-xs font-medium tracking-[0.14em] text-ink shadow-hard-sm',
        className,
      )}
    >
      {text}
      <span aria-hidden="true" className="absolute -bottom-[8px] left-7 h-3 w-3 rotate-45 border-b-[3px] border-r-[3px] border-ink bg-white" />
    </div>
  );
}
