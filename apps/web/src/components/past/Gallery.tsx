import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import SectionHeader from '@/components/SectionHeader';
import CableCard from '@/components/CableCard';
import Reveal from '@/components/Reveal';
import Memphis from '@/components/Memphis';
import { useLocale, pick } from '@/lib/locale';
import type { LText } from '@/lib/locale';

interface Edition {
  year: string;
  theme: LText;
  img: string;
  alt: LText;
  mono: LText;
  lines: LText[];
}

/** past.md §S4 — one illustrated recap card per edition. */
const EDITIONS: Edition[] = [
  {
    year: '2023',
    theme: { zh: '第一次相聚', en: 'The First Gathering' },
    img: '/recap-2023.svg',
    alt: {
      zh: '2023 年回顾插画：讲台、听众与大屏幕上的 WiFi 符号',
      en: '2023 recap illustration: a podium, the audience, and a Wi-Fi symbol on the big screen',
    },
    mono: { zh: '2023 // 300+ · 8 TALKS' },
    lines: [
      {
        zh: '首届 Community Day 中国站，300+ 开发者第一次在线下相聚。',
        en: 'The first Community Day in China — 300+ developers met in person for the first time.',
      },
      {
        zh: '从 EC2 到 Serverless，8 场分享讲到天黑也没人提前离场。',
        en: 'From EC2 to serverless, 8 sessions ran till dark — and nobody left early.',
      },
      {
        zh: 'User Group 社区，在这一年正式成桥。',
        en: 'The User Group community officially became a bridge that year.',
      },
    ],
  },
  {
    year: '2024',
    theme: { zh: '动手之年', en: 'The Year of Hands-On' },
    img: '/recap-2024.svg',
    alt: {
      zh: '2024 年回顾插画：两张桌子、笔记本上的代码符号与举手提问的人',
      en: '2024 recap illustration: two tables, code symbols on laptops, and attendees raising hands to ask questions',
    },
    mono: { zh: '2024 // 350+ · 4 WORKSHOPS' },
    lines: [
      {
        zh: 'Workshop 与 Hands-on Labs 成为标配，「带电脑来」第一次写进海报。',
        en: 'Workshops and Hands-on Labs became standard, and "bring your laptop" appeared on the poster for the first time.',
      },
      {
        zh: '四场动手实验排期排到走廊，实验账号发出去 400+ 个。',
        en: 'Four hands-on labs spilled into the hallway; over 400 lab accounts were handed out.',
      },
      {
        zh: '社区从「听」走向「做」。',
        en: 'The community moved from listening to doing.',
      },
    ],
  },
  {
    year: '2025',
    theme: { zh: '信号塔', en: 'The Signal Tower' },
    img: '/recap-2025.svg',
    alt: {
      zh: '2025 年回顾插画：发射塔向四周发出弧线，塔下听众剪影',
      en: '2025 recap illustration: a transmission tower radiating arcs, with audience silhouettes below',
    },
    mono: { zh: '2025 // 500+ · 16 TALKS' },
    lines: [
      {
        zh: '500+ 参会者，议题首次覆盖 AI 工程化。',
        en: '500+ attendees, with topics covering AI engineering for the first time.',
      },
      {
        zh: '社区讲师团成立，18 位讲师完成试讲打磨。',
        en: 'The community speaker program launched — 18 speakers completed rehearsal and polish sessions.',
      },
      {
        zh: '信号塔立起来，声音传得更远。',
        en: 'The signal tower stood up, and the voice carried farther.',
      },
    ],
  },
  {
    year: '2026.06',
    theme: { zh: 'Signal over Noise' },
    img: '/recap-2026summer.svg',
    alt: {
      zh: '2026 夏回顾插画：左侧杂乱碎片经滤网收敛为右侧一条干净波形',
      en: 'Summer 2026 recap illustration: scattered fragments on the left converge through a filter into a clean waveform on the right',
    },
    mono: { zh: '2026.06 // 800+ · 20 TALKS' },
    lines: [
      {
        zh: 'Signal over Noise——在噪音里找到信号。',
        en: 'Signal over Noise — finding the signal in the noise.',
      },
      {
        zh: '800+ 参会者、20+ 演讲、50万+ 曝光，历届之最。',
        en: '800+ attendees, 20+ talks, 500K+ impressions — the biggest edition yet.',
      },
      {
        zh: '找到信号之后，下一步：让信号成为桥。',
        en: 'After finding the signal, the next step: turn the signal into a bridge.',
      },
    ],
  },
];

/** §5.8 modal — paper panel, hard shadow, esc/mask/× close, scroll locked. */
function RecapModal({ edition, onClose }: { edition: Edition; onClose: () => void }) {
  const { t } = useTranslation('past');
  const locale = useLocale();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={t('gallery.recapAria', { year: edition.year, theme: pick(edition.theme, locale) })}
    >
      <motion.div
        className="absolute inset-0 bg-[rgba(20,20,20,0.72)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
        onClick={onClose}
      />
      <motion.div
        className="relative max-h-[85dvh] w-full max-w-[720px] overflow-y-auto rounded-lg border-[3px] border-ink bg-paper p-6 shadow-hard-xl md:p-8"
        initial={{ scale: 0.94, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 12, opacity: 0, transition: { duration: 0.15 } }}
        transition={{ duration: 0.28, ease: 'backOut' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('gallery.close')}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-[3px] border-ink bg-white font-mono text-lg font-bold text-ink shadow-hard-sm transition-transform duration-150 hover:-translate-y-0.5"
        >
          ×
        </button>
        <p className="font-mono text-xs font-medium tracking-[0.18em] text-ink/60">RECAP // {pick(edition.mono, locale)}</p>
        <h3 className="mt-3 font-sans text-2xl font-black text-ink md:text-3xl">
          <span className="font-display">{edition.year}</span> · {pick(edition.theme, locale)}
        </h3>
        <div className="mt-5 overflow-hidden rounded-md border-[3px] border-ink">
          <img src={edition.img} alt={pick(edition.alt, locale)} className="block w-full" />
        </div>
        <div className="mt-5 space-y-2.5">
          {edition.lines.map((l) => (
            <p key={l.zh} className="text-[15px] leading-[1.8] text-paper-dim">
              {pick(l, locale)}
            </p>
          ))}
        </div>
        <p className="mt-5 font-mono text-xs tracking-[0.14em] text-ink/60">{pick(edition.mono, locale)}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="inline-flex cursor-not-allowed items-center gap-2 font-mono text-sm font-medium uppercase tracking-[0.12em] text-ink/40">
            <span className="underline decoration-2 underline-offset-4">{t('gallery.archive')}</span>
            <span aria-hidden="true">→</span>
          </span>
          <span className="rounded-full border-[2.5px] border-ink/40 px-3 py-1 font-mono text-[11px] tracking-[0.14em] text-ink/40">{t('gallery.archiveBadge')}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Gallery() {
  const { t } = useTranslation('past');
  const locale = useLocale();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section className="relative bg-paper py-24 md:py-32">
      {/* Memphis: exactly 1 piece, top-left of the grid whitespace */}
      <Memphis id="dots-1" className="pointer-events-none absolute left-[4%] top-16 h-12 w-16 max-md:h-9 max-md:w-12" />

      <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
        <SectionHeader
          sig="SIG.02"
          label="GALLERY"
          title={t('gallery.title')}
          sub={t('gallery.sub')}
          accent="#FF4D3D"
        />

        <Reveal className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2" stagger={0.1}>
          {EDITIONS.map((e, i) => (
            <div
              key={e.year}
              role="button"
              tabIndex={0}
              aria-label={t('gallery.openRecap', { year: e.year, theme: pick(e.theme, locale) })}
              className="cursor-pointer"
              onClick={() => setOpenIdx(i)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  setOpenIdx(i);
                }
              }}
            >
              <CableCard className="p-0">
                {/* illustration: top full-bleed, zooms inside an overflow-hidden window */}
                <div className="overflow-hidden rounded-t-[5px]">
                  <img
                    src={e.img}
                    alt={pick(e.alt, locale)}
                    className="block w-full transition-transform [transition-duration:400ms] ease-out group-hover:scale-[1.04]"
                  />
                </div>
                <div className="flex items-end justify-between gap-4 p-5">
                  <div>
                    <p className="font-display text-2xl leading-none text-ink">{e.year}</p>
                    <p className="mt-2 font-sans text-[15px] font-bold text-ink">{pick(e.theme, locale)}</p>
                  </div>
                  <p className="shrink-0 font-mono text-[11px] tracking-[0.12em] text-ink/60">{pick(e.mono, locale)}</p>
                </div>
              </CableCard>
            </div>
          ))}
        </Reveal>
      </div>

      <AnimatePresence>
        {openIdx !== null && <RecapModal edition={EDITIONS[openIdx]} onClose={() => setOpenIdx(null)} />}
      </AnimatePresence>
    </section>
  );
}
