import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CableCardProps {
  children: ReactNode;
  className?: string;
  /** show the top cable wave that gets "plucked" on hover (motion ④) */
  cable?: boolean;
  /** show the two rivet dots (bridge riveting — the only fixed card ornament) */
  rivets?: boolean;
}

/**
 * Base card (design.md §5.3): white/paper fill, 3px ink border, 8px radius,
 * hard offset shadow. Hover: lifts -3px with deeper shadow + Cable Pluck.
 */
export default function CableCard({ children, className, cable = true, rivets = true }: CableCardProps) {
  return (
    <div
      className={cn(
        'group relative rounded-lg border-[3px] border-ink bg-white shadow-hard-lg',
        'transition-[transform,box-shadow] duration-200 ease-out',
        'hover:-translate-x-[3px] hover:-translate-y-[3px] hover:shadow-[11px_11px_0_#141414]',
        className,
      )}
    >
      {rivets && (
        <span className="absolute left-3 top-3 flex gap-1.5" aria-hidden="true">
          <span className="h-[6px] w-[6px] rounded-full bg-ink" />
          <span className="h-[6px] w-[6px] rounded-full bg-ink" />
        </span>
      )}
      {cable && (
        <svg
          viewBox="0 0 200 10"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 top-[14px] h-[10px] w-[calc(100%-3rem)] origin-center group-hover:animate-cable-pluck"
        >
          <path
            d="M0 5 Q12.5 0 25 5 T50 5 T75 5 T100 5 T125 5 T150 5 T175 5 T200 5"
            fill="none"
            stroke="#141414"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
      {children}
    </div>
  );
}
