import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import CompactHero from '@/components/schedule/CompactHero';
import FilterBar from '@/components/schedule/FilterBar';
import type { FilterPill } from '@/components/schedule/FilterBar';
import SpeakerCard, { FeaturedSpeakerCard } from '@/components/speakers/SpeakerCard';
import SpeakerModal from '@/components/speakers/SpeakerModal';
import Avatar from '@/components/schedule/Avatar';
import Memphis from '@/components/Memphis';
import { EASE_OUT, gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { useContentReady, useSpeakers } from '@/lib/content';
import { HEADLINER_IDS, SESSIONS, TRACKS, speakerById, trackById } from '@/components/schedule/data';
import type { Speaker, TrackId } from '@/components/schedule/data';
import { pick, useLocale } from '@/lib/locale';

type Filter = TrackId | 'all';

/** Keynote 讲者排最前（按主论坛出场时间），其余保持原顺序。 */
function keynoteFirst(list: Speaker[]): Speaker[] {
  const startOf = (sp: Speaker) => SESSIONS.find((x) => x.speakerIds.includes(sp.id))?.start ?? '99:99';
  const keynotes = list.filter((sp) => sp.track === 'keynote').sort((a, b) => startOf(a).localeCompare(startOf(b)));
  return [...keynotes, ...list.filter((sp) => sp.track !== 'keynote')];
}

const gridVariants = {
  show: { transition: { staggerChildren: 0.06 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

/**
 * 演讲嘉宾 /speakers (speakers.md): yellow compact hero with the avatar stack
 * → sticky track filter → speaker grid (featured headliners span 2 cols, two
 * open CFP seats at the end) → reused black CFP banner → Footer.
 * Supports /speakers#id deep links (opens that speaker's modal).
 */
export default function Speakers() {
  const [filter, setFilter] = useState<Filter>('all');
  const locale = useLocale();
  const { t } = useTranslation('speakers');
  // live list: bundled data first, hot-swapped when speakers.json arrives
  const speakers = useSpeakers();
  // 首次拉取完成前显示骨架屏，避免直开 /speakers 时「全部没数据」的空窗错觉
  const ready = useContentReady();
  // filter pills resolve bridge names per locale (module-level const can't);
  // 没有讲者的桥（如 Workshop）不出 pill，免得点进去一片空
  const pills = useMemo<FilterPill[]>(
    () => [
      { id: 'all', label: t('filter.all'), color: '#141414', textOn: '#FFD900', dot: '#FFD900' },
      ...TRACKS.filter((track) => speakers.some((s) => s.track === track.id)).map((track) => ({
        id: track.id,
        label: track.id === 'keynote' ? 'Keynote' : pick(track.bridge, locale),
        color: track.color,
        textOn: track.textOn,
        dot: track.color,
      })),
    ],
    [locale, t, speakers],
  );
  // /speakers#id deep link (e.g. from the schedule modal) opens that speaker
  // directly — resolved lazily on mount, no sync effect needed.
  const [selected, setSelected] = useState<Speaker | null>(() => {
    if (typeof window === 'undefined' || !window.location.hash) return null;
    return speakerById(window.location.hash.slice(1)) ?? null;
  });
  const [modalOpen, setModalOpen] = useState(() => selected !== null);

  const openSpeaker = (sp: Speaker) => {
    setSelected(sp);
    setModalOpen(true);
  };

  const filtered = useMemo(() => (filter === 'all' ? speakers : speakers.filter((s) => s.track === filter)), [filter, speakers]);
  const headliners = filtered.filter((s) => HEADLINER_IDS.includes(s.id));
  const featured = keynoteFirst(filtered.filter((s) => s.featured && !HEADLINER_IDS.includes(s.id)));
  const regular = keynoteFirst(filtered.filter((s) => !s.featured && !HEADLINER_IDS.includes(s.id)));

  return (
    <>
      <CompactHero
        kicker={t('hero.kicker')}
        accent="#2B5CE6"
        titleEn="Speakers"
        titleCn={t('hero.titleCn')}
        sub={t('hero.sub')}
        memphis={
          <Memphis id="ring" className="pointer-events-none absolute bottom-8 left-[4%] h-12 w-16 max-md:h-9 max-md:w-12" />
        }
        visual={<HeroAvatars />}
      />

      <FilterBar
        pills={pills}
        active={filter}
        onChange={(id) => setFilter(id as Filter)}
        right={
          <span className="font-mono text-xs font-medium tracking-[0.14em] text-ink/70">
            {ready ? t('filter.confirmed', { count: speakers.length }) : '…'}
          </span>
        }
      />

      <section className="relative bg-paper py-14 md:py-20">
        {/* Memphis: exactly 1 piece in the grid area */}
        <Memphis id="cross" className="pointer-events-none absolute right-[5%] top-10 h-12 w-16 max-md:h-9 max-md:w-12" />
        <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
          <AnimatePresence mode="wait">
            {/* key 带上 ready：whileInView(once) 在骨架屏阶段就触发过了，数据到了之后
                新挂载的卡片不会再收到 "show"，会一直停在 hidden（opacity 0）——
                表现为「全部」下看不到讲师，切一次筛选才出来。换 key 让网格重新入场。 */}
            <motion.div
              key={`${filter}-${ready}`}
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4"
              variants={gridVariants}
              initial="hidden"
              whileInView="show"
              // 'some' 而非比例阈值：讲者多了网格会远高于视口（手机上 22 人 ≈ 7000px），
              // 15% 永远进不了视口，卡片就一直停在 hidden
              viewport={{ once: true, amount: 'some' }}
              exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.18 } }}
            >
              {ready ? (
                <>
                  {/* 头牌嘉宾独占第一行 */}
                  {headliners.map((sp) => (
                    <motion.div key={sp.id} id={sp.id} variants={cardVariants} className="sm:col-span-2 xl:col-span-4">
                      <FeaturedSpeakerCard speaker={sp} onSelect={openSpeaker} />
                    </motion.div>
                  ))}
                  {featured.map((sp) => (
                    <motion.div key={sp.id} id={sp.id} variants={cardVariants} className="sm:col-span-2">
                      <FeaturedSpeakerCard speaker={sp} onSelect={openSpeaker} />
                    </motion.div>
                  ))}
                  {regular.map((sp) => (
                    <motion.div key={sp.id} id={sp.id} variants={cardVariants}>
                      <SpeakerCard speaker={sp} onSelect={openSpeaker} />
                    </motion.div>
                  ))}
                </>
              ) : (
                <>
                  <span className="sr-only">{pick({ zh: '嘉宾名单加载中', en: 'Loading speakers' }, locale)}</span>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="min-h-[280px] animate-pulse rounded-lg border-[3px] border-ink/10 bg-ink/5" aria-hidden="true" />
                  ))}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <SpeakerModal speaker={selected} open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

/**
 * Hero visual (speakers.md S1): 讲者墙前 3 位（头牌 + keynote，与网格同序）的
 * 照片头像，旋转 -6°/0°/6° 叠放。Entrance: stagger in from the right with back.out(2).
 * CFP 已关闭，不再放「等你来」虚线空位。
 */
function HeroAvatars() {
  const root = useRef<HTMLDivElement>(null);
  const speakers = useSpeakers();

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const tl = gsap.timeline({ delay: 0.35, defaults: { ease: 'back.out(2)' } });
      tl.from('[data-hv]', { x: 60, opacity: 0, duration: 0.55, stagger: 0.12 });
    },
    { scope: root },
  );

  const rotates = ['-6deg', '0deg', '6deg'];
  const trio = [
    ...speakers.filter((s) => HEADLINER_IDS.includes(s.id)),
    ...keynoteFirst(speakers.filter((s) => s.featured && !HEADLINER_IDS.includes(s.id))),
  ].slice(0, 3);

  return (
    <div ref={root} className="flex items-end pr-2">
      {trio.map((sp, i) => (
        <span
          key={sp.id}
          data-hv
          className="block rounded-lg shadow-hard"
          style={{ transform: `rotate(${rotates[i]})`, zIndex: i, marginLeft: i === 0 ? 0 : -14 }}
        >
          <Avatar initials={sp.initials} photo={sp.photo} color={trackById(sp.track).color} size={84} />
        </span>
      ))}
    </div>
  );
}

