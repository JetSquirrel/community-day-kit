import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import CableCard from '@/components/CableCard';
import { pick, useLocale } from '@/lib/locale';

const FORMATS = [
  {
    en: 'SESSION',
    cn: { zh: '主题演讲', en: 'Session Talk' },
    minutes: 35,
    lines: [
      { zh: '35 分钟深度分享 + 5 分钟 Q&A', en: '35-minute deep dive + 5-minute Q&A' },
      { zh: '分论坛会场，讲透一个技术主题', en: 'Breakout stage — one technical topic, fully explained' },
    ],
    fit: { zh: '体系化的深度实践', en: 'Systematic, in-depth practice' },
  },
  {
    en: 'LIGHTNING',
    cn: { zh: '闪电演讲', en: 'Lightning Talk' },
    minutes: 10,
    lines: [
      { zh: '一个观点、一次实践', en: 'One idea, one practice' },
      { zh: '轻装过桥，十分钟只讲透一件事', en: 'Cross the bridge light — one thing, fully explained in ten minutes' },
    ],
    fit: { zh: '首次登台与锋利观点', en: 'First-time speakers and sharp opinions' },
  },
  {
    en: 'WORKSHOP',
    cn: { zh: '动手实验', en: 'Hands-on Workshop' },
    minutes: 90,
    lines: [
      { zh: '60–90 分钟，带 30–50 人现场动手', en: '60–90 minutes, hands-on with 30–50 attendees on site' },
      { zh: '需自备实验方案与环境清单', en: 'Bring your own lab plan and environment checklist' },
    ],
    fit: { zh: '能带人动手的一线 Builder', en: 'Frontline Builders who get people building' },
  },
];

/**
 * CFP S3 — three ways across (paper, no Memphis). Cards stagger 0.15s;
 * the duration numerals count up Signal-Count style (power2.out).
 */
export default function Formats() {
  const root = useRef<HTMLElement>(null);
  const locale = useLocale();
  const { t } = useTranslation('cfp');

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from('.fmt-card', {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.15,
        scrollTrigger: { trigger: root.current, start: 'top 75%', once: true },
      });
      gsap.utils.toArray<HTMLElement>('.fmt-num').forEach((el) => {
        const target = Number(el.dataset.value ?? '0');
        const state = { v: 0 };
        gsap.to(state, {
          v: target,
          duration: 1.2,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          onUpdate: () => {
            el.textContent = String(Math.round(state.v));
          },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="bg-paper pb-24 pt-4 md:pb-28">
      <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {FORMATS.map((f) => (
            <CableCard key={f.en} cable={false} className="fmt-card flex flex-col p-6 pt-7">
              <p className="font-display text-5xl leading-none text-ink">
                <span className="fmt-num" data-value={f.minutes}>
                  {f.minutes}
                </span>
                &prime;
              </p>
              <h3 className="mt-5 font-sans text-2xl font-black text-ink">
                <span className="mr-2 font-mono text-sm font-medium tracking-[0.14em] text-ink/55">{f.en}</span>· {pick(f.cn, locale)}
              </h3>
              <p className="mt-3 text-[15px] leading-[1.7] text-paper-dim">
                {pick(f.lines[0], locale)}
                <br />
                {pick(f.lines[1], locale)}
              </p>
              <p className="mt-auto pt-5 font-mono text-[13px] font-medium tracking-[0.12em] text-ink/60">
                {t('formats.fitLabel')} // {pick(f.fit, locale)}
              </p>
            </CableCard>
          ))}
        </div>
      </div>
    </section>
  );
}
