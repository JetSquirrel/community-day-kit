import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { SITE } from '@/lib/site';

/**
 * sponsors.md §S6 — ink contact band. Entrance: 2px bridge line draws across
 * the top, one signal point crosses it once and fades; title rises, the two
 * CTAs pop in with back.out.
 */
export default function ContactBand() {
  const { t } = useTranslation('sponsors');
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
      tl.from('[data-band-line]', { scaleX: 0, duration: 0.6, ease: 'power2.inOut' })
        .fromTo('[data-band-dot]', { x: 0, opacity: 1 }, { x: travel, duration: 1.1, ease: 'power2.inOut' }, '-=0.15')
        .to('[data-band-dot]', { opacity: 0, duration: 0.3 }, '-=0.05')
        .from('[data-band-title]', { y: 36, opacity: 0, duration: 0.6 }, 0.15)
        .from('[data-band-cta]', { scale: 0.8, opacity: 0, duration: 0.5, ease: 'back.out(1.7)', stagger: 0.12 }, 0.45);
    },
    { scope: root },
  );

  return (
    <section ref={root} className="bg-ink py-16 md:py-20">
      <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
        {/* bridge line + one-shot signal pass */}
        <div ref={lineWrap} className="relative" aria-hidden="true">
          <div data-band-line className="h-[2px] w-full origin-left bg-signal" />
          <span data-band-dot className="absolute -top-[5px] left-0 h-3 w-3 rounded-full border-2 border-ink bg-pulse opacity-0" />
        </div>

        <div className="flex min-h-[200px] flex-col items-center justify-center gap-8 pt-10 text-center">
          <h2 data-band-title className="font-sans text-[clamp(28px,4.5vw,48px)] font-black leading-tight text-signal">
            {t('contact.title')}
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              data-band-cta
              href="/sponsorship-deck.pdf"
              className="inline-flex items-center rounded-full border-[3px] border-ink bg-spark px-8 py-3.5 font-sans text-lg font-bold text-white shadow-[6px_6px_0_#FFD900] transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_#FFD900] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#FFD900]"
            >
              {t('cta.download')}
            </a>
            <a
              data-band-cta
              href={`mailto:${SITE.email}`}
              className="inline-flex items-center rounded-full border-[3px] border-paper bg-transparent px-8 py-3.5 font-mono text-base font-medium text-paper transition-[transform,background-color,color] duration-150 hover:-translate-y-0.5 hover:bg-paper hover:text-ink"
            >
              {SITE.email}
            </a>
          </div>
          <p className="font-mono text-xs tracking-[0.18em] text-paper/60">{t('contact.deadline')}</p>
        </div>
      </div>
    </section>
  );
}
