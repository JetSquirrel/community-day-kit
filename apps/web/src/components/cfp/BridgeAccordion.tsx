import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { EASE_OUT } from '@/lib/gsap';
import { cn } from '@/lib/utils';

export interface BridgeAccordionItem {
  q: string;
  a: string;
}

interface BridgeAccordionProps {
  items: BridgeAccordionItem[];
  className?: string;
  /** index of the initially open item; -1 keeps all closed */
  defaultOpen?: number;
}

/**
 * Accordion per design.md §5.7: 3px ink cards stacked 16px apart, mono index
 * `Q.01` on the left, `+` rotates 45° into `×`. Panel opens with a 350ms
 * height animation (power3.out) and a 2px bridge line draws across the top
 * of the opened content (100ms). Accordion mode: only one open at a time.
 */
export default function BridgeAccordion({ items, className, defaultOpen = -1 }: BridgeAccordionProps) {
  const [open, setOpen] = useState<number>(defaultOpen);

  return (
    <>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className={cn('rounded-lg border-[3px] border-ink bg-white shadow-hard-sm', className)}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left md:px-6"
            >
              <span className="shrink-0 font-mono text-[13px] font-medium tracking-[0.12em] text-ink/45">
                Q.{String(i + 1).padStart(2, '0')}
              </span>
              <span className="flex-1 font-sans text-base font-bold text-ink md:text-lg">{item.q}</span>
              <motion.span
                aria-hidden="true"
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[3px] border-ink bg-signal font-mono text-lg font-bold leading-none text-ink"
              >
                +
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE_OUT }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 md:px-6">
                    {/* 2px bridge line draws once across the content top (100ms) */}
                    <motion.div
                      initial={{ clipPath: 'inset(0 100% 0 0)' }}
                      animate={{ clipPath: 'inset(0 0% 0 0)' }}
                      transition={{ duration: 0.1, delay: 0.15, ease: 'linear' }}
                      className="h-[6px]"
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 200 6" preserveAspectRatio="none" className="h-full w-full">
                        <path
                          d="M0 3 Q12.5 0 25 3 T50 3 T75 3 T100 3 T125 3 T150 3 T175 3 T200 3"
                          fill="none"
                          stroke="#141414"
                          strokeWidth="2"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    </motion.div>
                    <p className="pt-3 text-[15px] leading-[1.75] text-paper-dim md:text-base">{item.a}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </>
  );
}
