import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import Memphis from '@/components/Memphis';
import HeroBridges from '@/components/past/HeroBridges';
import Timeline from '@/components/past/Timeline';
import PastStats from '@/components/past/PastStats';
import Gallery from '@/components/past/Gallery';
import NextBridge from '@/components/past/NextBridge';

/**
 * /past — 来时的桥 (past.md): yellow compact hero with a depth queue of three
 * arches → horizontal-scrub timeline → yellow signal stats → paper recap
 * gallery + modal → ink "next bridge" band.
 */
export default function Past() {
  const { t } = useTranslation('past');
  const hero = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('[data-hero-kicker]', { clipPath: 'inset(0 100% 0 0)', duration: 0.4, ease: 'power2.out' })
        .from('.hero-char', { y: 56, opacity: 0, duration: 0.8, stagger: 0.05 }, '-=0.05')
        .from('[data-hero-sub]', { y: 24, opacity: 0, duration: 0.55 }, '-=0.4')
        // the three bridges rise from below, far → near, 0.2s apart
        .from('[data-hero-arch]', { y: 90, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.2 }, 0.35);
    },
    { scope: hero },
  );

  return (
    <>
      {/* S1 — compact page hero (yellow, 320px, one Memphis wave) */}
      <section ref={hero} className="relative overflow-hidden border-b-[3px] border-ink bg-signal">
        <Memphis id="wave-1" className="pointer-events-none absolute right-[6%] top-8 h-14 w-24 max-md:h-10 max-md:w-16" />
        <div className="mx-auto flex min-h-[320px] max-w-[1280px] flex-col justify-center px-6 py-14 xl:px-12">
          <p data-hero-kicker className="inline-flex items-center gap-2.5 font-mono text-[13px] font-medium uppercase tracking-[0.18em] text-ink">
            <span className="inline-block h-3 w-3 border-2 border-ink bg-bridge" />
            {t('hero.kicker')}
          </p>
          <h1 className="mt-5 font-sans text-[clamp(40px,6vw,76px)] font-black leading-[1.05] tracking-tight text-ink">
            {t('hero.title')
              .split('')
              .map((c, i) => (
                <span key={i} className="hero-char inline-block will-change-transform">
                  {c === ' ' ? '\u00A0' : c}
                </span>
              ))}
          </h1>
          <p data-hero-sub className="mt-5 max-w-[540px] text-base leading-[1.75] text-paper-dim md:text-lg">
            {t('hero.sub')}
          </p>
        </div>
        <HeroBridges />
      </section>

      {/* S2 — one bridge per edition (paper, horizontal scrub / vertical) */}
      <Timeline />

      {/* S3 — cumulative stats, signal count (yellow) */}
      <PastStats />

      {/* S4 — recap gallery with modal (paper) */}
      <Gallery />

      {/* S5 — the next bridge is ours (ink) */}
      <NextBridge />
    </>
  );
}
