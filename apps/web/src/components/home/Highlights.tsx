import { useTranslation } from 'react-i18next';
import { pick, useLocale } from '@/lib/locale';
import type { LText } from '@/lib/locale';
import SectionHeader from '@/components/SectionHeader';
import CableCard from '@/components/CableCard';
import Reveal from '@/components/Reveal';

const ITEMS: { no: string; en: string; title: LText; body: LText }[] = [
  {
    no: '01',
    en: 'KEYNOTE & COMMUNITY',
    title: { zh: '主题演讲与社区分享', en: 'Keynotes & Community Sharing' },
    body: { zh: '20+ 场覆盖云原生、AI/Agent、架构演进的实战分享，不讲 PPT 广告。', en: '20+ hands-on talks covering cloud-native, AI/Agents, and architecture evolution — no PPT ads.' },
  },
  {
    no: '02',
    en: 'HANDS-ON',
    title: { zh: 'Workshop 动手体验', en: 'Hands-on Workshops' },
    body: { zh: '真实场景驱动的动手实验，带上电脑，现场把技能带走。', en: 'Hands-on labs driven by real-world scenarios. Bring your laptop and take the skills home.' },
  },
  {
    no: '03',
    en: 'CONNECTION',
    title: { zh: '开发者社交', en: 'Developer Networking' },
    body: { zh: '600+ 同城开发者、User Group 组织者面对面，认识桥另一端的人。', en: 'Meet 600+ local developers and User Group organizers face to face — the people on the other side of the bridge.' },
  },
];

/**
 * S5 — why this bridge. Cards; the big translucent index number IS the
 * ornament, so this screen carries zero Memphis pieces.
 */
export default function Highlights() {
  const { t } = useTranslation('home');
  const locale = useLocale();
  return (
    <section className="bg-signal pb-24 pt-4 md:pb-32">
      <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
        <SectionHeader
          sig="SIG.02"
          label="WHY THIS BRIDGE"
          title={
            <>
              <span className="font-display">Why This Bridge</span>
              <span className="mx-3 font-sans">·</span>
              <span className="font-sans">{t('highlights.title')}</span>
            </>
          }
        />
        <Reveal className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2" stagger={0.12}>
          {ITEMS.map((it) => (
            <CableCard key={it.no} className="overflow-hidden p-7 pt-9">
              <span aria-hidden="true" className="pointer-events-none absolute -right-2 -top-7 font-display text-[120px] leading-none text-ink/10">
                {it.no}
              </span>
              <p className="font-mono text-xs font-medium tracking-[0.18em] text-ink/60">{it.en}</p>
              <h3 className="mt-3 font-sans text-2xl font-black text-ink">{pick(it.title, locale)}</h3>
              <p className="mt-3 max-w-[420px] leading-[1.75] text-paper-dim">{pick(it.body, locale)}</p>
            </CableCard>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
