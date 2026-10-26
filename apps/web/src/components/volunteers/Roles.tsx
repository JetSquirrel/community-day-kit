import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import SectionHeader from '@/components/SectionHeader';
import CableCard from '@/components/CableCard';
import Reveal from '@/components/Reveal';
import Memphis from '@/components/Memphis';
import { EASE_OUT } from '@/lib/gsap';
import { pick, useLocale, type LText } from '@/lib/locale';

interface Role {
  id: string;
  title: LText;
  duty: LText;
  quota: LText;
  detail: LText;
}

const ROLES: Role[] = [
  {
    id: 'POST 01',
    title: { zh: '签到引导组', en: 'Check-in & Wayfinding' },
    duty: {
      zh: '第一道桥口：签到、发牌、指路，给每个人过桥的第一步。',
      en: "The first bridge gate: check-in, badge handout, and directions — the first step of everyone's crossing.",
    },
    quota: { zh: '名额 // 12 人 · 时长 // 全天', en: 'Capacity // 12 people · Duration // Full day' },
    detail: {
      zh: '时间 // 07:30–10:30 为高峰，午后轮岗 · 要求 // 耐心细致，主动迎人，熟悉场馆动线（岗前培训统一讲解）。',
      en: 'Hours // Peak 07:30–10:30, afternoon rotations · Requirements // Patient and detail-oriented, proactive in greeting people, familiar with venue routes (covered in pre-event training).',
    },
  },
  {
    id: 'POST 02',
    title: { zh: '会场执行组', en: 'Venue Operations' },
    duty: {
      zh: '守住四座桥：分会场控场、计时、递麦、讲者协助。',
      en: 'Holding the four bridges: breakout room management, timekeeping, mic running, and speaker support.',
    },
    quota: { zh: '名额 // 10 人 · 时长 // 全天', en: 'Capacity // 10 people · Duration // Full day' },
    detail: {
      zh: '时间 // 全天分场轮值 · 要求 // 守时、能盯流程，临场反应快，不怯场。',
      en: 'Hours // Full-day rotations across breakout rooms · Requirements // Punctual, able to own a run-of-show, quick on your feet, comfortable in front of a crowd.',
    },
  },
  {
    id: 'POST 03',
    title: { zh: '直播技术组', en: 'Livestream Tech' },
    duty: {
      zh: '把信号传到桥外：推流、机位、线上互动。',
      en: 'Carrying the signal beyond the bridge: streaming, camera positions, and online interaction.',
    },
    quota: { zh: '名额 // 6 人 · 时长 // 全天', en: 'Capacity // 6 people · Duration // Full day' },
    detail: {
      zh: '时间 // 09:00–17:00 · 要求 // 了解 OBS / 推流基础，有直播或导播经验优先。',
      en: 'Hours // 09:00–17:00 · Requirements // Familiar with OBS / streaming basics; livestream or broadcast directing experience preferred.',
    },
  },
  {
    id: 'POST 04',
    title: { zh: '摄影记录组', en: 'Photography & Recording' },
    duty: {
      zh: '记录过桥的人：现场摄影摄像，需自带设备。',
      en: 'Capturing the people crossing the bridge: on-site photo and video — bring your own gear.',
    },
    quota: { zh: '名额 // 6 人 · 时长 // 全天', en: 'Capacity // 6 people · Duration // Full day' },
    detail: {
      zh: '时间 // 全天 · 要求 // 自带相机，活动结束后 48 小时内交付精选成片。',
      en: 'Hours // Full day · Requirements // Bring your own camera; deliver a curated selection of final shots within 48 hours after the event.',
    },
  },
  {
    id: 'POST 05',
    title: { zh: '嘉宾接待组', en: 'Guest Reception' },
    duty: {
      zh: '迎接上桥的人：讲者与嘉宾接待、行程协助。',
      en: 'Welcoming those boarding the bridge: speaker and guest reception, plus itinerary assistance.',
    },
    quota: { zh: '名额 // 4 人 · 时长 // 全天', en: 'Capacity // 4 people · Duration // Full day' },
    detail: {
      zh: '时间 // 10.16 晚间接机 / 接站 + 10.17 全天 · 要求 // 沟通顺畅，有接待经验优先。',
      en: 'Hours // Airport/station pickup on the evening of 10.16 + full day on 10.17 · Requirements // Strong communication skills; reception experience preferred.',
    },
  },
  {
    id: 'POST 06',
    title: { zh: '物料后勤组', en: 'Logistics & Supplies' },
    duty: {
      zh: '桥面养护：物资、餐饮、布场与撤场。',
      en: 'Bridge deck maintenance: supplies, catering, setup, and teardown.',
    },
    quota: { zh: '名额 // 8 人 · 时长 // 全天', en: 'Capacity // 8 people · Duration // Full day' },
    detail: {
      zh: '时间 // 07:00 布场 / 17:00 撤场 · 要求 // 体力在线，细致有条理。',
      en: 'Hours // Setup at 07:00 / teardown at 17:00 · Requirements // Physically fit, meticulous, and organized.',
    },
  },
];

function RoleCard({ role }: { role: Role }) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={() => setOpen((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOpen((v) => !v);
        }
      }}
      className="cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-pulse"
    >
      <CableCard className="h-full p-5 pt-9">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-sm font-medium tracking-[0.14em] text-ink/40 transition-colors duration-200 group-hover:text-spark">
            {role.id}
          </p>
          <motion.span
            aria-hidden="true"
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="font-mono text-2xl font-bold leading-none text-ink"
          >
            +
          </motion.span>
        </div>
        <h3 className="mt-3 font-sans text-xl font-black text-ink">{pick(role.title, locale)}</h3>
        <p className="mt-2 text-[15px] leading-[1.7] text-paper-dim">{pick(role.duty, locale)}</p>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <p className="mt-3 border-t-2 border-ink/10 pt-3 text-sm leading-[1.7] text-paper-dim">{pick(role.detail, locale)}</p>
            </motion.div>
          )}
        </AnimatePresence>
        <p className="mt-4 font-mono text-xs font-medium tracking-[0.14em] text-ink/60">{pick(role.quota, locale)}</p>
      </CableCard>
    </div>
  );
}

/**
 * Volunteers S2 — six keeper posts (paper). Cards stagger 0.08s; hover does
 * a Cable Pluck and lights the post number Signal Red; clicking a card
 * expands its duty details in place (300ms height animation, no modal).
 */
export default function Roles() {
  const { t } = useTranslation('volunteers');
  return (
    <section className="relative bg-paper py-24 md:py-28">
      {/* Memphis: exactly 1 piece (dots), top-right whitespace */}
      <Memphis id="dots-1" className="pointer-events-none absolute right-[5%] top-10 h-12 w-16 max-md:h-9 max-md:w-12" />

      <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
        <SectionHeader
          sig="SIG.01"
          label="ROLES"
          title={t('roles.title')}
          sub={t('roles.sub')}
          accent="#FF4D3D"
        />

        <Reveal className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" stagger={0.08}>
          {ROLES.map((r) => (
            <RoleCard key={r.id} role={r} />
          ))}
        </Reveal>
      </div>
    </section>
  );
}
