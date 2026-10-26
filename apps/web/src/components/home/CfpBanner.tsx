import { useRef } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { useLocalePath } from '@/lib/locale';
import { SITE } from '@/lib/site';

/**
 * S10 — CFP banner: bring your signal onto the bridge. Black band (black is
 * scarce = it carries weight). Entrance: chars walk in, title staggers, CTA
 * pops with back.out; hovering the CTA blinks the robot's antenna light twice.
 */
export default function CfpBanner() {
  const { t } = useTranslation('home');
  const lp = useLocalePath();
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: { trigger: root.current, start: 'top 75%', once: true },
      });
      tl.from('[data-cfp-chars]', { x: -40, opacity: 0, duration: 0.6 })
        .from('[data-cfp-kicker]', { clipPath: 'inset(0 100% 0 0)', duration: 0.4, ease: 'power2.out' }, '-=0.3')
        .from('.cfp-word', { y: 36, opacity: 0, duration: 0.5, stagger: 0.07 }, '-=0.15')
        .from('[data-cfp-body]', { y: 16, opacity: 0, duration: 0.4 }, '-=0.2')
        .from('[data-cfp-cta]', { scale: 0.8, opacity: 0, duration: 0.5, ease: 'back.out(1.7)' }, '-=0.2');
    },
    { scope: root },
  );

  return (
    <section ref={root} className="group bg-ink py-16 md:py-20">
      <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-10 px-6 lg:flex-row lg:justify-between xl:px-12">
        {/* mascot */}
        <div data-cfp-chars className="relative flex shrink-0 items-end" aria-hidden="true">
          <img src="/ug-mascot.webp" alt="" className="h-40 w-auto" />
        </div>

        {/* copy */}
        <div className="max-w-[560px] text-center lg:text-left">
          <p data-cfp-kicker className="inline-flex items-center gap-2.5 font-mono text-[13px] font-medium uppercase tracking-[0.18em] text-signal">
            <span className="inline-block h-3 w-3 border-2 border-ink bg-spark" />
            {SITE.cfpOpen ? 'SIG.06 // CALL FOR PROPOSALS' : 'SIG.06 // CALL FOR PROPOSALS — CLOSED'}
          </p>
          <h2 className="mt-4 font-display text-[clamp(34px,4.5vw,56px)] leading-[1.02] text-signal">
            <span className="cfp-word inline-block">Bring</span> <span className="cfp-word inline-block">Your</span>{' '}
            <span className="cfp-word inline-block">Signal</span>
          </h2>
          <p className="cfp-word mt-2 font-sans text-[clamp(22px,2.8vw,32px)] font-black text-signal">{t('cfp.title')}</p>
          <p data-cfp-body className="mt-4 leading-[1.75] text-paper/75">
            {t('cfp.body')}
          </p>
        </div>

        {/* CTA */}
        <div data-cfp-cta className="cta-zone flex shrink-0 flex-col items-center gap-3 lg:items-end">
          <Link
            to={lp('/cfp')}
            className="cta-link inline-flex items-center rounded-full border-[3px] border-ink bg-spark px-9 py-4 font-sans text-lg font-bold text-white shadow-[6px_6px_0_#FFD900] transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_#FFD900] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#FFD900]"
          >
            {t('cfp.cta')}
          </Link>
          <span className="ann ann-n ann-on-ink font-mono text-xs tracking-[0.18em] text-paper/60" data-note={t('cfp.deadlineNote')}>
            {SITE.cfpOpen ? 'DEADLINE // 08.31' : 'CLOSED // 08.31'}
          </span>
        </div>
      </div>
    </section>
  );
}
