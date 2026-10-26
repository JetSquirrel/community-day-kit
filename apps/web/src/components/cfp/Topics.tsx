import { useTranslation } from 'react-i18next';
import SectionHeader from '@/components/SectionHeader';
import CableCard from '@/components/CableCard';
import Reveal from '@/components/Reveal';
import Memphis from '@/components/Memphis';
import { pick, useLocale } from '@/lib/locale';

const TOPICS = [
  { ch: 'CH.01', title: { zh: '云架构演进', en: 'Cloud Architecture Evolution' }, eg: { zh: '高可用、微服务、架构重构实战', en: 'High availability, microservices, architecture refactoring in practice' } },
  { ch: 'CH.02', title: { zh: 'AI / Agent', en: 'AI / Agent' }, eg: { zh: 'LLM 应用、Agent 工程、RAG、多模态', en: 'LLM apps, agent engineering, RAG, multimodal' } },
  { ch: 'CH.03', title: { zh: 'Serverless', en: 'Serverless' }, eg: { zh: '函数计算、事件驱动、云原生应用', en: 'Function compute, event-driven, cloud-native apps' } },
  { ch: 'CH.04', title: { zh: '云安全', en: 'Cloud Security' }, eg: { zh: '攻防实战、合规、零信任', en: 'Offense & defense in practice, compliance, zero trust' } },
  { ch: 'CH.05', title: { zh: 'Kubernetes', en: 'Kubernetes' }, eg: { zh: '容器、平台工程、GitOps', en: 'Containers, platform engineering, GitOps' } },
  { ch: 'CH.06', title: { zh: '数据平台', en: 'Data Platform' }, eg: { zh: '数据湖仓、实时计算、BI 工程化', en: 'Lakehouse, real-time computing, production-grade BI' } },
  { ch: 'CH.07', title: { zh: 'DevOps / 平台工程', en: 'DevOps / Platform Engineering' }, eg: { zh: 'CI/CD、可观测、开发者体验', en: 'CI/CD, observability, developer experience' } },
  { ch: 'CH.08', title: { zh: '成本优化 FinOps', en: 'FinOps & Cost Optimization' }, eg: { zh: '降本实战、资源治理、账单解读', en: 'Cost-cutting in practice, resource governance, decoding the bill' } },
];

/**
 * CFP S2 — eight signal channels (paper). Cards stagger in 0.08s; hover does
 * a Cable Pluck and flips the channel number to Pulse Purple (频道被选中).
 */
export default function Topics() {
  const locale = useLocale();
  const { t } = useTranslation('cfp');

  return (
    <section className="relative bg-paper py-24 md:py-28">
      {/* Memphis: exactly 1 piece (triangle), bottom-left whitespace */}
      <Memphis id="tri-1" className="pointer-events-none absolute bottom-10 left-[4%] h-12 w-16 max-md:h-9 max-md:w-12" />

      <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
        <SectionHeader
          sig="SIG.01"
          label={t('topics.label')}
          title={t('topics.title')}
          sub={t('topics.sub')}
          accent="#6C3FD4"
        />

        <Reveal className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4" stagger={0.08}>
          {TOPICS.map((topic) => (
            <CableCard key={topic.ch} className="p-5 pt-9">
              <p className="font-mono text-2xl font-medium tracking-wide text-ink/30 transition-colors duration-200 group-hover:text-pulse">
                {topic.ch}
              </p>
              <h3 className="mt-3 font-sans text-xl font-black text-ink">{pick(topic.title, locale)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-paper-dim">{pick(topic.eg, locale)}</p>
            </CableCard>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
