import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import Memphis from '@/components/Memphis';
import QuestionSign from '@/components/faq/QuestionSign';
import FaqExplorer from '@/components/faq/FaqExplorer';
import FaqContactBand from '@/components/faq/FaqContactBand';
import { SITE } from '@/lib/site';

/**
 * /faq — 过桥指南 (faq.md): yellow compact hero with the "?" road sign →
 * sticky search/filter bar → grouped accordion → ink contact band.
 * Tool-type page: motion restrained, one loop only (the sign sway).
 */
export default function Faq() {
  const { t } = useTranslation('faq');
  const hero = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('[data-hero-kicker]', { clipPath: 'inset(0 100% 0 0)', duration: 0.4, ease: 'power2.out' })
        .from('.hero-char', { y: 56, opacity: 0, duration: 0.8, stagger: 0.05 }, '-=0.05')
        .from('[data-hero-sub]', { y: 24, opacity: 0, duration: 0.55 }, '-=0.4');
    },
    { scope: hero },
  );

  return (
    <>
      {/* S1 — compact page hero (yellow, 300px, one Memphis cross) */}
      <section ref={hero} className="relative overflow-hidden border-b-[3px] border-ink bg-signal">
        <Memphis id="cross" className="pointer-events-none absolute bottom-8 left-[5%] h-12 w-16 max-md:h-9 max-md:w-12" />
        <div className="mx-auto flex min-h-[300px] max-w-[1280px] items-center justify-between gap-8 px-6 py-14 xl:px-12">
          <div className="max-w-[640px]">
            <p data-hero-kicker className="inline-flex items-center gap-2.5 font-mono text-[13px] font-medium uppercase tracking-[0.18em] text-ink">
              <span className="inline-block h-3 w-3 border-2 border-ink bg-pulse" />
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
            <p data-hero-sub className="mt-5 max-w-[520px] text-base leading-[1.75] text-paper-dim md:text-lg">
              {t('hero.sub')}
              <a href={`mailto:${SITE.email}`} className="font-bold text-ink underline underline-offset-2">
                {SITE.email}
              </a>
            </p>
          </div>
          <div className="hidden sm:block">
            <QuestionSign />
          </div>
        </div>
      </section>

      {/* S2 + S3 — sticky search/filter bar + grouped accordion */}
      <FaqExplorer />

      {/* S4 — ink contact band */}
      <FaqContactBand />
    </>
  );
}
