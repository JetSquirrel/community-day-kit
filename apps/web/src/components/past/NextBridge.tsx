import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { SITE } from '@/lib/site';

const EN_WORDS = ['The', 'Next', 'Bridge', 'Is', 'Ours'];

/**
 * past.md §S5 — ink closing band. The top bridge line draws left→right
 * (600ms), then one signal point crosses once and STAYS LIT at the right end:
 * the signal has arrived at this edition. Title word-stagger, CTAs back.out.
 */
export default function NextBridge() {
  const { t } = useTranslation('past');
  const root = useRef<HTMLElement>(null);
  const lineWrap = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const travel = () => Math.max(0, (lineWrap.current?.clientWidth ?? 0) - 12);
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: { trigger: root.current, start: 'top 78%', once: true },
      });
      tl.from('[data-nb-line]', { scaleX: 0, duration: 0.6, ease: 'power2.inOut' })
        .fromTo('[data-nb-dot]', { x: 0, opacity: 1 }, { x: travel, duration: 1.1, ease: 'power2.inOut' }, '-=0.1')
        .from('[data-nb-kicker]', { clipPath: 'inset(0 100% 0 0)', duration: 0.4, ease: 'power2.out' }, 0.2)
        .from('.nb-word', { y: 36, opacity: 0, duration: 0.5, stagger: 0.07 }, 0.4)
        .from('[data-nb-cn]', { y: 24, opacity: 0, duration: 0.5 }, 0.75)
        .from('[data-nb-body]', { y: 16, opacity: 0, duration: 0.4 }, 0.9)
        .from('[data-nb-cta]', { scale: 0.8, opacity: 0, duration: 0.5, ease: 'back.out(1.7)', stagger: 0.12 }, 1.0);
    },
    { scope: root },
  );

  return (
    <section ref={root} className="bg-ink py-16 md:py-20">
      <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
        {/* bridge line: signal crosses once and stays lit at the far end */}
        <div ref={lineWrap} className="relative" aria-hidden="true">
          <div data-nb-line className="h-[2px] w-full origin-left bg-signal" />
          <span data-nb-dot className="absolute -top-[5px] left-0 h-3 w-3 rounded-full border-2 border-ink bg-pulse opacity-0" />
        </div>

        <div className="flex min-h-[280px] flex-col items-center justify-center gap-5 pt-12 text-center">
          <p data-nb-kicker className="font-mono text-[13px] font-medium uppercase tracking-[0.18em] text-signal">
            {t('next.kicker')}
          </p>
          <h2 className="font-display text-[clamp(34px,5.5vw,72px)] leading-[1.02] tracking-tight text-signal">
            {EN_WORDS.map((w) => (
              <span key={w} className="nb-word inline-block will-change-transform">
                {w}
                {' '}
              </span>
            ))}
          </h2>
          <p data-nb-cn className="font-sans text-[clamp(22px,3vw,36px)] font-black text-white">
            {t('next.title')}
          </p>
          <p data-nb-body className="text-base leading-[1.75] text-paper/60 md:text-lg">
            {t('next.body')}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
            {SITE.registerUrl && (
              <span data-nb-cta className="inline-block">
                <a
                  href={SITE.registerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border-[3px] border-ink bg-spark px-8 py-3.5 font-sans text-lg font-bold text-white shadow-[6px_6px_0_#FFD900] transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_#FFD900] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#FFD900]"
                >
                  {t('common:common.register')}
                </a>
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
