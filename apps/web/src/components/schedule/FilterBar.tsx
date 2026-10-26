import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FilterPill {
  id: string;
  label: string;
  /** active-state fill (track accent color) */
  color: string;
  /** text color on the active fill */
  textOn: string;
  /** the 8px dot — track color, signal yellow for 全部 */
  dot: string;
}

interface FilterBarProps {
  pills: FilterPill[];
  active: string;
  onChange: (id: string) => void;
  /** desktop-only right slot (view toggle / session count) */
  right?: ReactNode;
}

/**
 * Sticky track filter bar (schedule.md S2 / speakers.md S2): pins at top 72px
 * under the Navbar, paper bg + 3px ink bottom border, z-index below Navbar.
 * Active pill = color fill + 3px ink border + hard shadow; a 2px wave line
 * draws once (300ms) under the newly selected pill.
 */
export default function FilterBar({ pills, active, onChange, right }: FilterBarProps) {
  const { t } = useTranslation('schedule');
  return (
    <div className="sticky top-[72px] z-40 border-b-[3px] border-ink bg-paper">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-6 xl:px-12">
        <div
          className="flex items-center gap-2.5 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label={t('filter.ariaLabel')}
        >
          {pills.map((p) => {
            const isActive = p.id === active;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onChange(p.id)}
                aria-pressed={isActive}
                className={cn(
                  'relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border-[3px] border-ink px-4 py-1.5 font-sans text-sm font-bold transition-[transform,box-shadow,background-color,color] duration-150',
                  isActive ? 'shadow-hard-sm' : 'bg-white text-ink hover:bg-signal',
                )}
                style={isActive ? { backgroundColor: p.color, color: p.textOn } : undefined}
              >
                <span
                  className={cn('h-2 w-2 rounded-full border-2', isActive ? 'border-current' : 'border-ink')}
                  style={{ backgroundColor: p.dot }}
                  aria-hidden="true"
                />
                {p.label}
                {isActive && (
                  <motion.span
                    key={active}
                    className="wave-underline absolute -bottom-[9px] left-2 right-2 h-[6px] origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.3 }}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
        {right ? <div className="hidden shrink-0 items-center gap-4 md:flex">{right}</div> : null}
      </div>
    </div>
  );
}
