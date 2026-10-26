import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import Button from '@/components/Button';
import Memphis from '@/components/Memphis';
import { BreathingDot, SpeechBubble } from '@/components/cfp/SignalBits';
import { SITE } from '@/lib/site';

export const CFP_MAILTO = `mailto:${SITE.email}?subject=${encodeURIComponent(`${SITE.event} · 议题投稿`)}`;

function scrollToPerks() {
  document.getElementById('cfp-perks')?.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  });
}

function scrollToApply() {
  document.getElementById('cfp-apply')?.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  });
}

/**
 * CFP S1 — page hero (yellow, 420px): bring your signal onto the bridge.
 * Entrance: kicker wipe → title char stagger → CN subtitle → copy/CTA →
 * characters walk in from the right (700ms) → bubble pops (back.out(2)).
 * Only loop on this screen: the green status breathing dot.
 */
export default function CfpHero() {
  const root = useRef<HTMLElement>(null);
  const { t } = useTranslation('cfp');

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('[data-kicker]', { clipPath: 'inset(0 100% 0 0)', duration: 0.4, ease: 'power2.out' })
        .from('.cfph-char', { y: 56, opacity: 0, duration: 0.7, stagger: 0.028 }, '-=0.05')
        .from('[data-sub-cn]', { y: 26, opacity: 0, duration: 0.5 }, '-=0.35')
        .from('[data-desc]', { y: 20, opacity: 0, duration: 0.5 }, '-=0.3')
        .from('[data-cta]', { y: 20, opacity: 0, duration: 0.45, stagger: 0.08 }, '-=0.25')
        .from('[data-chars]', { x: 60, opacity: 0, duration: 0.7 }, '-=0.55')
        .from('[data-bubble]', { scale: 0, opacity: 0, duration: 0.5, ease: 'back.out(2)' }, '-=0.2')
        .from('[data-status]', { opacity: 0, duration: 0.4 }, '-=0.15');
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative overflow-hidden bg-signal">
      {/* Memphis: exactly 1 piece (dots), top-right whitespace */}
      <Memphis id="dots-1" className="pointer-events-none absolute right-[5%] top-8 h-14 w-20 max-md:h-10 max-md:w-14" />

      <div className="mx-auto flex min-h-[420px] max-w-[1280px] flex-col px-6 py-12 xl:px-12">
        <div className="grid flex-1 items-center gap-10 lg:grid-cols-12">
          {/* left 8 columns */}
          <div className="lg:col-span-8">
            <p data-kicker className="inline-flex items-center gap-2.5 font-mono text-[13px] font-medium uppercase tracking-[0.18em] text-ink">
              <span className="inline-block h-3 w-3 border-2 border-ink bg-spark" />
              {SITE.cfpOpen ? t('hero.kicker') : t('hero.kickerClosed')}
            </p>

            <h1 className="mt-5 font-display leading-[0.98] tracking-[-0.02em] text-ink text-[clamp(40px,6.4vw,84px)]">
              {t('hero.title').split('').map((c, i) => (
                <span key={i} className="cfph-char inline-block will-change-transform">
                  {c === ' ' ? ' ' : c}
                </span>
              ))}
            </h1>

            <p data-sub-cn className="mt-4 font-sans text-[clamp(24px,3.4vw,40px)] font-black tracking-[0.06em] text-ink">
              {t('hero.titleCn')}
            </p>

            <p data-desc className="mt-5 max-w-[560px] text-base leading-[1.75] text-paper-dim md:text-lg">
              {SITE.cfpOpen ? t('hero.desc') : t('hero.descClosed')}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              {SITE.cfpOpen && (
                <span data-cta>
                  <Button variant="red" onClick={scrollToApply} className="px-8 py-3.5 text-lg">
                    {t('hero.ctaApply')}
                  </Button>
                </span>
              )}
              <span data-cta>
                <Button variant="secondary" onClick={scrollToPerks} className="px-8 py-3.5 text-lg">
                  {t('hero.ctaPerks')}
                </Button>
              </span>
            </div>
          </div>

          {/* right 4 columns (desktop): builder + robot, bubble overhead */}
          <div className="hidden lg:col-span-4 lg:block" aria-hidden="true">
            <div data-chars className="relative flex items-end justify-center gap-4 pt-16">
              <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2">
                <div data-bubble style={{ transformOrigin: '50% 100%' }}>
                  <SpeechBubble text={SITE.cfpOpen ? t('hero.bubble') : t('hero.bubbleClosed')} />
                </div>
              </div>
              <img src="/ug-mascot.webp" alt="" className="h-48 w-auto" />
            </div>
          </div>
        </div>

        {/* bottom mono status line */}
        <p data-status className="mt-10 flex items-center gap-2.5 font-mono text-[13px] font-medium tracking-[0.14em] text-ink">
          <BreathingDot />
          {SITE.cfpOpen ? t('hero.status') : t('hero.statusClosed')}
        </p>
      </div>
    </section>
  );
}
