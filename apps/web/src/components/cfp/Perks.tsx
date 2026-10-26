import { useTranslation } from 'react-i18next';
import SectionHeader from '@/components/SectionHeader';
import CableCard from '@/components/CableCard';
import Reveal from '@/components/Reveal';
import Memphis from '@/components/Memphis';
import { pick, useLocale } from '@/lib/locale';

const PERKS = [
  {
    title: { zh: '全通门票 & 讲师礼包', en: 'All-Access Pass & Speaker Kit' },
    desc: { zh: '大会全通权限、讲师专属周边与证件。', en: 'Full access to the event, plus speaker-exclusive swag and badge.' },
  },
  {
    title: { zh: '社区曝光', en: 'Community Exposure' },
    desc: { zh: '官网、公众号、视频回放全渠道署名传播，你的信号被更多人收到。', en: 'Credited exposure across the website, WeChat official account, and video replays — your signal reaches a wider audience.' },
  },
  {
    title: { zh: '讲师晚宴', en: 'Speaker Dinner' },
    desc: { zh: '与各领域讲者、社区组织者的闭门交流。', en: 'A closed-door evening with speakers from every field and community organizers.' },
  },
  {
    title: { zh: '荣誉认证', en: 'Honorary Recognition' },
    desc: { zh: '亚马逊云科技用户社区认证讲师证书与年度评优资格。', en: 'AWS User Group certified-speaker certificate and eligibility for the annual awards.' },
  },
];

/**
 * CFP S5 — speaker perks (yellow). 2×2 white cards, stagger 0.1s, hover
 * Cable Pluck. Anchor target of the hero's "查看演讲者权益 ↓" button.
 */
export default function Perks() {
  const locale = useLocale();
  const { t } = useTranslation('cfp');

  return (
    <section id="cfp-perks" className="relative scroll-mt-24 bg-signal py-24 md:py-28">
      {/* Memphis: exactly 1 piece (wave), top-right whitespace */}
      <Memphis id="wave-1" className="pointer-events-none absolute right-[5%] top-10 h-12 w-20 max-md:h-9 max-md:w-14" />

      <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
        <SectionHeader sig="SIG.03" label={t('perks.label')} title={t('perks.title')} accent="#FF4D3D" />

        <Reveal className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2" stagger={0.1}>
          {PERKS.map((p) => (
            <CableCard key={p.title.zh} className="p-6 pt-9">
              <h3 className="font-sans text-2xl font-black text-ink">{pick(p.title, locale)}</h3>
              <p className="mt-2.5 leading-[1.75] text-paper-dim">{pick(p.desc, locale)}</p>
            </CableCard>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
