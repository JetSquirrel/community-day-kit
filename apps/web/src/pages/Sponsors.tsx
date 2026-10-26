import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import Memphis from '@/components/Memphis';
import Button from '@/components/Button';
import Anatomy from '@/components/sponsors/Anatomy';
import BenefitsTable from '@/components/sponsors/BenefitsTable';
import PastPartners from '@/components/sponsors/PastPartners';
import SponsorForm from '@/components/sponsors/SponsorForm';
import ContactBand from '@/components/sponsors/ContactBand';

/**
 * /sponsors — 共建这座桥 (sponsors.md): yellow compact hero → paper bridge
 * anatomy → yellow benefits table → paper past partners → ink contact band.
 * One bridge moment per screen; Memphis ≤1 piece per screen.
 */
export default function Sponsors() {
  const { t } = useTranslation('sponsors');
  const hero = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('[data-hero-kicker]', { clipPath: 'inset(0 100% 0 0)', duration: 0.4, ease: 'power2.out' })
        .from('.hero-char', { y: 56, opacity: 0, duration: 0.8, stagger: 0.05 }, '-=0.05')
        .from('[data-hero-sub]', { y: 24, opacity: 0, duration: 0.55 }, '-=0.4')
        // CTA row: delayed elastic entrance (400ms after start)
        .from('[data-hero-cta]', { scale: 0.82, opacity: 0, duration: 0.55, ease: 'back.out(1.8)', stagger: 0.1 }, 0.4);
    },
    { scope: hero },
  );

  return (
    <>
      {/* S1 — compact page hero (yellow, 340px, one Memphis ring) */}
      <section ref={hero} className="relative overflow-hidden border-b-[3px] border-ink bg-signal">
        <Memphis id="ring" className="pointer-events-none absolute bottom-8 right-[6%] h-16 w-20 max-md:h-12 max-md:w-16" />
        <div className="mx-auto flex min-h-[340px] max-w-[1280px] flex-col justify-center px-6 py-14 xl:px-12">
          <p data-hero-kicker className="inline-flex items-center gap-2.5 font-mono text-[13px] font-medium uppercase tracking-[0.18em] text-ink">
            <span className="inline-block h-3 w-3 border-2 border-ink bg-growth" />
            {t('hero.kicker')}
          </p>
          <h1 className="mt-5 font-sans text-[clamp(40px,6vw,76px)] font-black leading-[1.05] tracking-tight text-ink">
            {t('hero.title').split('').map((c, i) => (
              <span key={i} className="hero-char inline-block will-change-transform">
                {c}
              </span>
            ))}
          </h1>
          <p data-hero-sub className="mt-5 max-w-[560px] text-base leading-[1.75] text-paper-dim md:text-lg">
            {t('hero.sub')}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <span data-hero-cta className="inline-block">
              <Button variant="red" href="/sponsorship-deck.pdf">
                {t('cta.download')}
              </Button>
            </span>
            <span data-hero-cta className="inline-block">
              <Button variant="secondary" href="#sponsor-apply">
                {t('cta.contact')}
              </Button>
            </span>
          </div>
        </div>
      </section>

      {/* S2 — bridge anatomy: tiers are structural parts (paper) */}
      <Anatomy />

      {/* S3 — benefits matrix (yellow) */}
      <BenefitsTable />

      {/* S4 + S5 — past co-builders + community partners (paper) */}
      <PastPartners />

      {/* S5.5 — sponsor application form (paper → mailto fallback when API absent) */}
      <section className="bg-paper pb-24 pt-4 md:pb-32">
        <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
          <SponsorForm />
        </div>
      </section>

      {/* S6 — ink contact band */}
      <ContactBand />
    </>
  );
}
