import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePartners } from '@/lib/content';
import { mergePartners, isPaidSponsor } from '@/components/sponsors/currentPartnersData';
import type { CurrentPartner } from '@/components/sponsors/currentPartnersData';
import SectionHeader from '@/components/SectionHeader';
import Reveal from '@/components/Reveal';

/** 统一样式格：白底 + 3px 墨线 + 硬阴影，与 /sponsors 的共建者墙同一规格 */
const CELL =
  'flex h-20 items-center justify-center rounded-lg border-[3px] border-ink bg-white px-4 shadow-hard-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-hard';

function PartnerCell({ partner }: { partner: CurrentPartner }) {
  const inner = partner.logo ? (
    <img src={partner.logo} alt={partner.name} className="max-h-[60%] max-w-full object-contain" loading="lazy" />
  ) : (
    <span className="font-sans font-bold text-ink/80">{partner.name}</span>
  );
  return partner.url ? (
    <a href={partner.url} target="_blank" rel="noreferrer" className={CELL} title={partner.name}>
      {inner}
    </a>
  ) : (
    <div className={CELL} title={partner.name}>
      {inner}
    </div>
  );
}

/** 一段平铺 logo 墙：4 列（窄屏 2 列、中屏 3 列） */
function Wall({ label, partners }: { label: string; partners: CurrentPartner[] }) {
  if (partners.length === 0) return null;
  return (
    <div>
      <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-ink/60">{label}</p>
      <Reveal className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4" stagger={0.04} y={24}>
        {partners.map((p) => (
          <div key={p.name}>
            <PartnerCell partner={p} />
          </div>
        ))}
      </Reveal>
    </div>
  );
}

/**
 * S11 — co-builders of the bridge. 两段平铺，无档位分级：赞助伙伴（付费赞助，
 * isPaidSponsor）在前，合作伙伴（社区合作宣发）在后，格子统一 4 列。
 * Bundled roster (currentPartnersData, 组委会名单) + live sponsors.json from the
 * Feishu 赞助商表（同名覆盖、新条目追加）。
 */
export default function SponsorsPreview() {
  const { t } = useTranslation('home');
  const live = usePartners();
  const all = useMemo(() => mergePartners(live), [live]);
  const sponsors = all.filter(isPaidSponsor);
  const partners = all.filter((p) => !isPaidSponsor(p));
  return (
    <section className="bg-paper py-24 md:py-32">
      <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
        <SectionHeader
          sig="SIG.07"
          label="SPONSORS"
          title={
            <>
              <span className="font-sans">{t('sponsors.title')}</span>
              <span className="mx-3 font-sans">·</span>
              <span className="font-sans">{t('sponsors.titleSub')}</span>
            </>
          }
          sub={t('sponsors.sub')}
          accent="#2ECC71"
        />

        <div className="mt-12 space-y-12">
          <Wall label={t('sponsors.paidLabel')} partners={sponsors} />
          <Wall label={t('sponsors.partnersLabel')} partners={partners} />
        </div>
      </div>
    </section>
  );
}
