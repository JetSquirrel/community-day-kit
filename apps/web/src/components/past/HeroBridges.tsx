/**
 * past.md §S1 — three arch bridges queued by depth: nearest solid Bridge
 * Blue, the two far ones ink outline at 60% / 35% opacity. They rise from
 * below, far → near, staggered 0.2s (entrance driven by the page hero).
 * Arch language reuses divider-arch.svg's single-arch form.
 */
export default function HeroBridges() {
  return (
    <div className="pointer-events-none absolute bottom-0 right-[3%] hidden items-end md:flex" aria-hidden="true">
      {/* far — 35% outline */}
      <svg data-hero-arch viewBox="0 0 200 96" className="-mr-10 h-20 w-auto opacity-35">
        <path d="M24 88 Q100 8 176 88" fill="none" stroke="#141414" strokeWidth={5} strokeLinecap="round" />
        <path d="M8 88 H40 M160 88 H192" fill="none" stroke="#141414" strokeWidth={5} strokeLinecap="round" />
      </svg>
      {/* mid — 60% outline */}
      <svg data-hero-arch viewBox="0 0 200 96" className="-mr-8 h-28 w-auto opacity-60">
        <path d="M24 88 Q100 8 176 88" fill="none" stroke="#141414" strokeWidth={5} strokeLinecap="round" />
        <path d="M8 88 H40 M160 88 H192" fill="none" stroke="#141414" strokeWidth={5} strokeLinecap="round" />
      </svg>
      {/* near — solid Bridge Blue */}
      <svg data-hero-arch viewBox="0 0 200 96" className="h-40 w-auto">
        <path d="M24 88 Q100 8 176 88 Z" fill="#2B5CE6" stroke="#141414" strokeWidth={5} strokeLinejoin="round" />
        <path d="M8 88 H40 M160 88 H192" fill="none" stroke="#141414" strokeWidth={5} strokeLinecap="round" />
      </svg>
    </div>
  );
}
