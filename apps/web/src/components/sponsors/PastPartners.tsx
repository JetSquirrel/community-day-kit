import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import SectionHeader from '@/components/SectionHeader';
import Reveal from '@/components/Reveal';
import { PAST_PARTNERS } from '@/components/sponsors/pastPartnersData';
import { mergePartners, isPaidSponsor } from '@/components/sponsors/currentPartnersData';
import { usePartners } from '@/lib/content';
import { SITE } from '@/lib/site';

const LOGO_BOX =
  'flex h-20 items-center justify-center rounded-lg border-[3px] border-ink bg-white px-4 font-mono text-sm tracking-[0.14em] text-ink/40 shadow-hard-sm transition-[transform,box-shadow,color] duration-200 hover:-translate-y-[3px] hover:text-ink hover:shadow-hard';

/** 本届共建者 logo 墙：每格一个 logo（缺 logo 时退回名称）。 */
function PartnerWall({ partners, className }: { partners: { name: string; logo?: string; tier?: string }[]; className?: string }) {
  return (
    <Reveal className={className ?? 'grid grid-cols-3 gap-4 md:grid-cols-6'} stagger={0.04} y={24}>
      {partners.map((p) => (
        <div key={p.name}>
          <PartnerLogo partner={p} />
        </div>
      ))}
    </Reveal>
  );
}

export default function PastPartners() {
  const { t } = useTranslation('sponsors');
  const live = usePartners();
  const all = useMemo(() => mergePartners(live), [live]);
  const sponsors = all.filter(isPaidSponsor);
  const community = all.filter((p) => !isPaidSponsor(p));
  return (
    <>
      {/* S4 — past co-builders, trust wall (paper). Static historical roster
          (pastPartnersData.ts); this edition's roster is the S5 wall below. */}
      <section className="bg-paper py-24 md:py-28">
        <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
          <SectionHeader
            sig="SIG.02"
            label={t('past.label')}
            title={t('past.title')}
            sub={t('past.sub')}
            accent="#2ECC71"
          />

          <Reveal className="mt-12 grid grid-cols-3 gap-4 md:grid-cols-6" stagger={0.04} y={24}>
            {PAST_PARTNERS.map((p) => (
              <div key={p.name}>
                <PartnerLogo partner={p} />
              </div>
            ))}
          </Reveal>

          <p className="mt-10 text-center font-mono text-xs tracking-[0.18em] text-ink/60 md:text-sm">
            {t('past.stats')}
          </p>
        </div>
      </section>

      {/* same-color adjacency (paper→paper): the single bridge-arch divider */}
      <div className="bg-paper px-6" aria-hidden="true">
        <img src="/divider-arch.svg" alt="" className="mx-auto h-16 w-full max-w-[1280px] md:h-20" />
      </div>

      {/* S5 — 本届共建者：付费赞助方 + 合作社区（内置名单 + 飞书 sponsors.json 合并） */}
      <section className="bg-paper py-24 md:py-28">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-end justify-between gap-8 px-6 xl:px-12">
          <div className="max-w-[760px]">
            <h3 className="font-sans text-2xl font-black text-ink md:text-[28px]">{t('community.title')}</h3>
            <p className="mt-4 max-w-[520px] text-sm leading-7 text-ink/70">
              {t('community.body')}
            </p>
          </div>
          <a
            href={`mailto:${SITE.email}?subject=${encodeURIComponent(t('community.mailSubject'))}`}
            className="group inline-flex shrink-0 items-center gap-2 font-mono text-sm font-medium uppercase tracking-[0.12em] text-ink"
          >
            <span className="underline decoration-2 underline-offset-4">{t('community.cta')}</span>
            <span aria-hidden="true" className="inline-block transition-transform duration-300 group-hover:translate-x-1.5">
              →
            </span>
          </a>
        </div>

        <div className="mx-auto mt-12 max-w-[1280px] px-6 xl:px-12">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-ink/60">{t('community.sponsorsLabel')}</p>
          <PartnerWall className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4" partners={sponsors} />

          <p className="mt-10 font-mono text-xs font-medium uppercase tracking-[0.18em] text-ink/60">{t('community.partnersLabel')}</p>
          <PartnerWall className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4" partners={community} />
        </div>
      </section>
    </>
  );
}

/** Real partner mark — logo image, falls back to name (no external links recorded). */
function PartnerLogo({ partner }: { partner: { name: string; logo?: string; tier?: string } }) {
  return (
    <div className={LOGO_BOX} title={partner.tier ? `${partner.name} · ${partner.tier}` : partner.name}>
      {partner.logo ? (
        <img src={partner.logo} alt={partner.name} className="max-h-10 max-w-full object-contain" loading="lazy" />
      ) : (
        <span className="font-sans font-bold normal-case tracking-normal text-ink/70">{partner.name}</span>
      )}
    </div>
  );
}
