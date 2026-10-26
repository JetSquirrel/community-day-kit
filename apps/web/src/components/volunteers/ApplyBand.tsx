import { useRef } from 'react';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import BridgeAccordion from '@/components/cfp/BridgeAccordion';
import VolunteerForm from '@/components/volunteers/VolunteerForm';
import { pick, useLocale, type LText } from '@/lib/locale';

interface FaqItem {
  q: LText;
  a: LText;
}

const FAQ: FaqItem[] = [
  {
    q: { zh: '需要经验吗？', en: 'Do I need experience?' },
    a: {
      zh: '不需要。所有岗位均提供培训与岗前说明会，带来责任心即可。',
      en: 'No. Every post comes with training and a pre-event briefing — just bring your sense of responsibility.',
    },
  },
  {
    q: { zh: '可以只来半天吗？', en: 'Can I come for just half a day?' },
    a: {
      zh: '优先全天；部分岗位支持半日轮班，申请表中可注明你的可用时段。',
      en: 'Full-day availability is preferred; some posts support half-day shifts — note your availability in the application form.',
    },
  },
  {
    q: { zh: '学生可以报名吗？', en: 'Can students apply?' },
    a: { zh: '非常欢迎，年满 18 岁即可报名。', en: 'Absolutely — anyone 18 or older is welcome to apply.' },
  },
];

/**
 * Volunteers S5 — quick FAQ + the black apply band (paper section, ink card).
 * The two columns enter toward each other; the apply button pops elastic.
 */
export default function ApplyBand() {
  const locale = useLocale();
  const root = useRef<HTMLElement>(null);
  const faqItems = FAQ.map((f) => ({ q: pick(f.q, locale), a: pick(f.a, locale) }));

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: { trigger: root.current, start: 'top 75%', once: true },
      });
      tl.from('[data-apply-left]', { x: -40, opacity: 0, duration: 0.7 })
        .from('[data-apply-right]', { x: 40, opacity: 0, duration: 0.7 }, '<');
    },
    { scope: root },
  );

  return (
    <section ref={root} className="bg-paper pb-24 pt-4 md:pb-32">
      <div className="mx-auto grid max-w-[1280px] items-start gap-10 px-6 lg:grid-cols-2 xl:px-12">
        {/* left: three quick questions */}
        <div data-apply-left className="space-y-4">
          <BridgeAccordion items={faqItems} defaultOpen={0} />
        </div>

        {/* right: the application form (mailto fallback when the API isn't configured) */}
        <div data-apply-right>
          <VolunteerForm />
        </div>
      </div>
    </section>
  );
}
