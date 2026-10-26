import { useTranslation } from 'react-i18next';
import { pick, useLocale, useLocalePath } from '@/lib/locale';
import type { LText } from '@/lib/locale';
import SectionHeader from '@/components/SectionHeader';
import CableCard from '@/components/CableCard';
import Reveal from '@/components/Reveal';
import Memphis from '@/components/Memphis';
import { GhostLink } from '@/components/Button';

const TRACKS: { id: string; no: string; color: string; img: string; title: LText; chips: LText[]; talks: string }[] = [
  {
    id: 'ai',
    no: 'TRACK 01 · AI SIGNAL',
    color: '#6C3FD4',
    img: '/track-bridge-ai.svg',
    title: { zh: '智能桥 · AI 与 Agent', en: 'AI Bridge · AI & Agents' },
    chips: [
      { zh: 'LLM 应用', en: 'LLM Apps' },
      { zh: 'Agent 工程', en: 'Agent Engineering' },
      { zh: 'RAG', en: 'RAG' },
    ],
    talks: '5 TALKS',
  },
  {
    id: 'builder',
    no: 'TRACK 02 · BUILDER SIGNAL',
    color: '#2B5CE6',
    img: '/track-bridge-builder.svg',
    title: { zh: '建造者桥 · 云原生架构', en: 'Builder Bridge · Cloud-Native Architecture' },
    chips: [
      { zh: 'Serverless', en: 'Serverless' },
      { zh: 'K8s', en: 'K8s' },
      { zh: 'IaC', en: 'IaC' },
    ],
    talks: '5 TALKS',
  },
  {
    id: 'spark',
    no: 'TRACK 03 · SPARK SIGNAL',
    color: '#FF4D3D',
    img: '/track-bridge-spark.svg',
    title: { zh: '星火桥 · 初创与成长', en: 'Spark Bridge · Startups & Growth' },
    chips: [
      { zh: 'OPC 一人公司', en: 'OPC (One-Person Company)' },
      { zh: 'indie 出海', en: 'Indie Going Global' },
      { zh: '开源商业化', en: 'Open-Source Monetization' },
      { zh: '技术创业', en: 'Tech Startups' },
    ],
    talks: '5 TALKS',
  },
  {
    id: 'global',
    no: 'TRACK 04 · GLOBAL SIGNAL',
    color: '#2ECC71',
    img: '/track-bridge-global.svg',
    title: { zh: '远洋桥 · 全球化与出海', en: 'Global Bridge · Going Global' },
    chips: [
      { zh: '多区域架构', en: 'Multi-Region Arch' },
      { zh: '合规', en: 'Compliance' },
      { zh: 'Global Infra', en: 'Global Infra' },
    ],
    talks: '5 TALKS',
  },
];

/**
 * S7 — four bridges, four crossings. Each track owns one accent color
 * (color = information, design.md §1). Hover: cable pluck + one signal crosses
 * the bridge once (CSS dot-cross, re-armed on every hover).
 */
export default function Tracks() {
  const { t } = useTranslation('home');
  const locale = useLocale();
  const lp = useLocalePath();
  return (
    <section className="relative bg-paper py-24 md:py-32">
      {/* Memphis: exactly 1 piece */}
      <Memphis id="cross" className="pointer-events-none absolute right-[6%] top-16 h-14 w-20 max-md:h-10 max-md:w-14" />

      <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
        <SectionHeader
          sig="SIG.03"
          label="TRACKS"
          title={
            <>
              <span className="font-display">Four Bridges</span>
              <span className="mx-3 font-sans">·</span>
              <span className="font-sans">{t('tracks.title')}</span>
            </>
          }
          sub={t('tracks.sub')}
        />

        <Reveal className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2" stagger={0.12}>
          {TRACKS.map((track) => (
            <CableCard key={track.id} className="p-0" rivets={false}>
              {/* 8px accent top bar */}
              <span className="block h-2 w-full rounded-t-[5px]" style={{ backgroundColor: track.color }} aria-hidden="true" />
              <div className="p-7">
                {/* bridge vignette + one-shot crossing signal */}
                <div className="relative mx-auto w-full max-w-[300px]">
                  <img src={track.img} alt={t('tracks.illustrationAlt', { title: pick(track.title, locale) })} className="block w-full" />
                  <span
                    aria-hidden="true"
                    className="absolute top-[62%] h-3 w-3 rounded-full border-2 border-ink opacity-0 group-hover:animate-dot-cross"
                    style={{ backgroundColor: track.color }}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between font-mono text-xs font-medium tracking-[0.14em] text-ink/70">
                  <span>{track.no}</span>
                  <span>{track.talks}</span>
                </div>
                <h3 className="mt-3 font-sans text-2xl font-black text-ink">{pick(track.title, locale)}</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {track.chips.map((c) => (
                    <span key={c.zh} className="rounded-full border-[2.5px] border-ink bg-paper px-3 py-1 font-mono text-xs">
                      {pick(c, locale)}
                    </span>
                  ))}
                </div>
                <GhostLink to={lp(`/schedule?track=${track.id}`)} className="mt-6">
                  {t('tracks.viewAgenda')}
                </GhostLink>
              </div>
            </CableCard>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
