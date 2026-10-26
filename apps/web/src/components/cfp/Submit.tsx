import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import SectionHeader from '@/components/SectionHeader';
import Reveal from '@/components/Reveal';
import BridgeAccordion from '@/components/cfp/BridgeAccordion';
import ApplyForm from '@/components/cfp/ApplyForm';
import { pick, useLocale } from '@/lib/locale';

const QA = [
  {
    q: { zh: '投稿需要包含什么？', en: 'What should a submission include?' },
    a: {
      zh: '标题（≤30 字）、摘要（200–500 字）、目标听众、三个要点收获、讲者简介与联系方式；Workshop 另附实验大纲与环境要求。',
      en: 'Title (≤30 characters), abstract (200–500 characters), target audience, three key takeaways, plus speaker bio and contact info. Workshops also include a lab outline and environment requirements.',
    },
  },
  {
    q: { zh: '议题有什么要求？', en: 'What are the requirements for a talk?' },
    a: {
      zh: '真实实践优先，拒绝纯产品宣讲；可粤语/普通话/英语；鼓励首次登台，社区提供演讲辅导。',
      en: 'Real-world practice first — no pure product pitches. Talks can be in Cantonese, Mandarin, or English. First-time speakers are encouraged, and the community offers talk coaching.',
    },
  },
  {
    q: { zh: '可以投几个议题？', en: 'How many proposals can I submit?' },
    a: {
      zh: '每人最多 2 个；同一议题不可重复投递多个频道。',
      en: 'Up to 2 per person; the same talk may not be submitted to multiple channels.',
    },
  },
  {
    q: { zh: '评审标准是什么？', en: 'What are the review criteria?' },
    a: {
      zh: '实践价值 40% · 主题契合 30% · 表达清晰 30%，由 User Group 社区评审组交叉评分。',
      en: 'Practical value 40% · topic fit 30% · clarity 30%, cross-scored by the User Group community review panel.',
    },
  },
  {
    q: { zh: '外地讲者有差旅支持吗？', en: 'Is travel support available for out-of-town speakers?' },
    a: {
      zh: '差旅赞助仅开放给拥有亚马逊云科技社区身份（Community Hero / Community Builder / User Group Leader / User Group Ambassador）的讲者，赞助内容为一晚住宿，不含交通。',
      en: 'Travel sponsorship is available only to speakers holding an AWS community title (Community Hero / Community Builder / User Group Leader / User Group Ambassador): one night of accommodation — transportation is not included.',
    },
  },
];

/**
 * CFP S6 — 信号发射协议 (paper, no Memphis): the submission accordion plus
 * the closing CTA. Items stagger 0.08s; CTA pops with back.out(1.7).
 */
export default function Submit() {
  const root = useRef<HTMLElement>(null);
  const locale = useLocale();
  const { t } = useTranslation('cfp');
  const items = QA.map((item) => ({ q: pick(item.q, locale), a: pick(item.a, locale) }));

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from('.submit-cta', {
        scale: 0.8,
        opacity: 0,
        duration: 0.6,
        ease: 'back.out(1.7)',
        scrollTrigger: { trigger: '.submit-cta', start: 'top 85%', once: true },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="bg-paper py-24 md:py-28">
      <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
        <SectionHeader sig="SIG.04" label={t('submit.label')} title={t('submit.title')} accent="#FF4D3D" />

        <Reveal className="mt-12 max-w-[820px] space-y-4" stagger={0.08}>
          <BridgeAccordion items={items} defaultOpen={0} />
        </Reveal>

        <div id="cfp-apply" className="submit-cta mt-14 scroll-mt-24">
          <ApplyForm />
        </div>
      </div>
    </section>
  );
}
