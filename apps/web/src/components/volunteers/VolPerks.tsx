import { useTranslation } from 'react-i18next';
import SectionHeader from '@/components/SectionHeader';
import CableCard from '@/components/CableCard';
import Reveal from '@/components/Reveal';
import Memphis from '@/components/Memphis';
import { pick, useLocale, type LText } from '@/lib/locale';

interface Perk {
  glyph: string;
  title: LText;
  desc: LText;
}

const PERKS: Perk[] = [
  {
    glyph: 'PASS',
    title: { zh: '全通门票', en: 'Full-Access Pass' },
    desc: { zh: '大会全通权限与工作餐', en: 'Full conference access plus staff meals' },
  },
  {
    glyph: 'TEE',
    title: { zh: '限定周边', en: 'Exclusive Swag' },
    desc: { zh: '守桥人限定 T 恤与徽章（志愿者专属款）', en: 'Keeper-exclusive T-shirt and badge (volunteers only)' },
  },
  {
    glyph: 'CERT',
    title: { zh: '荣誉证书', en: 'Certificate' },
    desc: { zh: '社区认证志愿者证书与时长记录', en: 'Community-certified volunteer certificate with logged service hours' },
  },
  {
    glyph: 'NET',
    title: { zh: '内推网络', en: 'Insider Network' },
    desc: { zh: '与讲者、赞助商、组织者同群交流', en: 'A shared community group with speakers, sponsors, and organizers' },
  },
];

/**
 * Volunteers S3 — keeper perks (yellow). Four white cards with a centered
 * display glyph word; stagger 0.1s; hover Cable Pluck.
 */
export default function VolPerks() {
  const { t } = useTranslation('volunteers');
  const locale = useLocale();
  return (
    <section className="relative bg-signal py-24 md:py-28">
      {/* Memphis: exactly 1 piece (triangle), bottom-left whitespace */}
      <Memphis id="tri-1" className="pointer-events-none absolute bottom-10 left-[4%] h-12 w-16 max-md:h-9 max-md:w-12" />

      <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
        <SectionHeader sig="SIG.02" label="PERKS" title={t('perks.title')} accent="#FF4D3D" />

        <Reveal className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4" stagger={0.1}>
          {PERKS.map((p) => (
            <CableCard key={p.glyph} className="p-6 pt-9 text-center">
              <p className="font-display text-[40px] leading-none tracking-tight text-ink">{p.glyph}</p>
              <h3 className="mt-4 font-sans text-xl font-black text-ink">{pick(p.title, locale)}</h3>
              <p className="mt-2 text-sm leading-[1.7] text-paper-dim">{pick(p.desc, locale)}</p>
            </CableCard>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
