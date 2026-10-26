import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import Button from '@/components/Button';
import Memphis from '@/components/Memphis';
import { BreathingDot, SpeechBubble } from '@/components/cfp/SignalBits';
import { SITE } from '@/lib/site';

export const VOL_MAILTO = `mailto:${SITE.email}?subject=${encodeURIComponent('2026 Community Day 深圳 · 守桥人申请')}`;

/**
 * Volunteers S1 — page hero (yellow, 380px): become a Bridge Keeper.
 * Same grammar as the CFP hero: title char stagger, character walks in,
 * bubble pops, status dot breathes (the only loop on this screen).
 */
export default function VolHero() {
  const { t } = useTranslation('volunteers');
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('[data-kicker]', { clipPath: 'inset(0 100% 0 0)', duration: 0.4, ease: 'power2.out' })
        .from('.vh-char', { y: 56, opacity: 0, duration: 0.7, stagger: 0.05 }, '-=0.05')
        .from('[data-desc]', { y: 20, opacity: 0, duration: 0.5 }, '-=0.3')
        .from('[data-cta]', { y: 20, opacity: 0, duration: 0.45 }, '-=0.25')
        .from('[data-status]', { opacity: 0, duration: 0.4 }, '-=0.2')
        .from('[data-chars]', { x: 60, opacity: 0, duration: 0.7 }, '-=0.55')
        .from('[data-bubble]', { scale: 0, opacity: 0, duration: 0.5, ease: 'back.out(2)' }, '-=0.2');
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative overflow-hidden bg-signal">
      {/* Memphis: exactly 1 piece (wave), top-left whitespace */}
      <Memphis id="wave-1" className="pointer-events-none absolute left-[4%] top-8 h-12 w-20 max-md:h-9 max-md:w-14" />

      <div className="mx-auto flex min-h-[380px] max-w-[1280px] items-center px-6 py-12 xl:px-12">
        <div className="grid w-full items-center gap-10 lg:grid-cols-12">
          {/* left 8 columns */}
          <div className="lg:col-span-8">
            <p data-kicker className="inline-flex items-center gap-2.5 font-mono text-[13px] font-medium uppercase tracking-[0.18em] text-ink">
              <span className="inline-block h-3 w-3 border-2 border-ink bg-spark" />
              VOLUNTEERS // BRIDGE KEEPERS
            </p>

            <h1 className="mt-5 font-sans text-[clamp(44px,7vw,88px)] font-black leading-[1.02] tracking-tight text-ink">
              {t('hero.title')
                .split('')
                .map((c, i) => (
                  <span key={i} className="vh-char inline-block will-change-transform">
                    {c}
                  </span>
                ))}
            </h1>

            <p data-desc className="mt-5 max-w-[560px] text-base leading-[1.75] text-paper-dim md:text-lg">
              {t('hero.desc')}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <span data-cta>
                <Button variant="red" href="#vol-apply" className="px-8 py-3.5 text-lg">
                  {t('hero.cta')}
                </Button>
              </span>
              <p data-status className="flex items-center gap-2.5 font-mono text-[13px] font-medium tracking-[0.14em] text-ink">
                <BreathingDot />
                {t('hero.status')}
              </p>
            </div>
          </div>

          {/* right 4 columns (desktop): single keeper + bubble */}
          <div className="hidden lg:col-span-4 lg:block" aria-hidden="true">
            <div data-chars className="relative flex items-end justify-center pt-16">
              <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2">
                <div data-bubble style={{ transformOrigin: '50% 100%' }}>
                  <SpeechBubble text="KEEPER WANTED" />
                </div>
              </div>
              <img src="/ug-mascot.webp" alt="" className="h-[180px] w-auto" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
