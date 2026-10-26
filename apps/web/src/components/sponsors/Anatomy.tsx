import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import CableCard from '@/components/CableCard';
import { SITE } from '@/lib/site';
import { pick, useLocale } from '@/lib/locale';
import type { LText } from '@/lib/locale';

type TierId = 'diamond' | 'platinum' | 'gold' | 'silver';

interface Tier {
  id: TierId;
  color: string;
  partEn: string;
  partCn: LText;
  name: LText;
  en: string;
  limit: string;
  benefits: LText[];
  /** neat-annotations direction class — which way the hand-drawn arrow points at the dot */
  ann: 'ann-se' | 'ann-s' | 'ann-sw' | 'ann-ne';
  /** optional neat-annotations fine-tuning vars (label/arrow nudges) */
  annVars?: Record<string, string>;
  dot: { cx: number; cy: number };
}

/**
 * sponsors.md §S2 — tiers map to suspension-bridge anatomy (color = tier).
 * Geometry mirrors the public asset sponsor-anatomy.svg (1200×800); inlined
 * here so parts can be drawn in and tinted per interaction spec. Hotspot
 * labels are hand-drawn neat-annotations (HTML overlay, % of the 1200×800 box).
 */
const TIERS: Tier[] = [
  {
    id: 'diamond',
    color: '#6C3FD4',
    partEn: 'TOWER',
    partCn: { zh: '主塔', en: 'Tower' },
    name: { zh: '钻石赞助', en: 'Diamond Sponsor' },
    en: 'DIAMOND',
    limit: 'LIMIT 1',
    benefits: [
      { zh: 'Keynote 开场致谢', en: 'Keynote opening acknowledgment' },
      { zh: '主论坛黄金展位', en: 'Prime booth at the main stage' },
      { zh: 'LOGO 上主视觉与证件', en: 'Logo on key visuals and badges' },
      { zh: '5 分钟开幕致辞', en: '5-minute opening address' },
      { zh: '大会门票 10 张', en: '10 conference passes' },
      { zh: '公众号头条联动', en: 'Headline feature on our WeChat official account' },
    ],
    ann: 'ann-se',
    dot: { cx: 368, cy: 215 },
  },
  {
    id: 'platinum',
    color: '#2B5CE6',
    partEn: 'CABLE',
    partCn: { zh: '主缆', en: 'Cable' },
    name: { zh: '铂金赞助', en: 'Platinum Sponsor' },
    en: 'PLATINUM',
    limit: 'LIMIT 3',
    benefits: [
      { zh: '分论坛冠名', en: 'Naming rights for a breakout track' },
      { zh: '标准展位', en: 'Standard booth' },
      { zh: 'LOGO 上官网与现场主屏', en: 'Logo on the website and venue main screen' },
      { zh: '大会门票 6 张', en: '6 conference passes' },
      { zh: '公众号推文联动', en: 'Featured post on our WeChat official account' },
    ],
    ann: 'ann-s',
    dot: { cx: 598, cy: 260 },
  },
  {
    id: 'gold',
    color: '#FF4D3D',
    partEn: 'DECK',
    partCn: { zh: '桥面', en: 'Deck' },
    name: { zh: '金牌赞助', en: 'Gold Sponsor' },
    en: 'GOLD',
    limit: 'LIMIT 6',
    benefits: [
      { zh: '开发者市集展位', en: 'Booth at the developer market' },
      { zh: 'LOGO 上官网与签名墙', en: 'Logo on the website and signature wall' },
      { zh: '大会门票 4 张', en: '4 conference passes' },
      { zh: '社群推送', en: 'Push across community channels' },
    ],
    ann: 'ann-sw',
    dot: { cx: 994, cy: 475 },
  },
  {
    id: 'silver',
    color: '#2ECC71',
    partEn: 'PIER',
    partCn: { zh: '桥墩', en: 'Pier' },
    name: { zh: '银牌赞助', en: 'Silver Sponsor' },
    en: 'SILVER',
    limit: 'LIMIT 10',
    benefits: [
      { zh: 'LOGO 上官网', en: 'Logo on the website' },
      { zh: '大会门票 2 张', en: '2 conference passes' },
      { zh: '周边入袋', en: 'Swag in attendee bags' },
    ],
    ann: 'ann-ne',
    /* clear the water squiggle left of the pier */
    annVars: { '--ann-text-x': '-62px', '--ann-arrow-x': '-14px' },
    dot: { cx: 366, cy: 621 },
  },
];

const COLOR_BY_ID = Object.fromEntries(TIERS.map((t) => [t.id, t.color])) as Record<TierId, string>;

const HANGERS = ['M430 235.7 V470', 'M490 255 V470', 'M550 266.1 V470', 'M610 268.9 V470', 'M670 263.4 V470', 'M730 249.5 V470', 'M790 227.4 V470'];

export default function Anatomy() {
  const { t } = useTranslation('sponsors');
  const locale = useLocale();
  const root = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<TierId>('diamond');
  const active = TIERS.find((tier) => tier.id === activeId)!;

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      // Bridge anatomy draws itself in build order (echoes motion ③):
      // piers → towers → main cable + hangers → deck, then hotspots pop in.
      const shapes = root.current!.querySelectorAll<SVGGeometryElement>('[data-draw]');
      shapes.forEach((s) => {
        const len = s.getTotalLength();
        s.style.strokeDasharray = `${len}`;
        s.style.strokeDashoffset = `${len}`;
      });
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: 'top 72%', once: true },
      });
      tl.to('[data-part="pier"] [data-draw]', { strokeDashoffset: 0, duration: 0.4, ease: 'power2.inOut' })
        .to('[data-part="tower"] [data-draw]', { strokeDashoffset: 0, duration: 0.4, ease: 'power2.inOut' }, '-=0.05')
        .to('[data-part="cable"] [data-draw]', { strokeDashoffset: 0, duration: 0.5, ease: 'power2.inOut', stagger: 0.04 }, '-=0.05')
        .to('[data-part="deck"] [data-draw]', { strokeDashoffset: 0, duration: 0.35, ease: 'power2.inOut' }, '-=0.05')
        .from('[data-hotspot]', { scale: 0, opacity: 0, transformOrigin: '50% 50%', duration: 0.45, ease: 'back.out(2.2)', stagger: 0.12 }, '-=0.1');
    },
    { scope: root },
  );

  /** active tier's bridge part thickens to 5px and takes the tier color */
  const partStyle = (id: TierId): CSSProperties => ({
    stroke: activeId === id ? COLOR_BY_ID[id] : '#141414',
    strokeWidth: activeId === id ? 5 : 4,
    transition: 'stroke 0.25s ease, stroke-width 0.25s ease',
  });

  return (
    <section className="bg-paper py-24 md:py-32" aria-label={t('anatomy.ariaLabel')}>
      <div ref={root} className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-10 px-6 lg:grid-cols-12 xl:px-12">
        {/* anatomy — horizontally scrollable on small screens */}
        <div className="overflow-x-auto lg:col-span-9">
          {/* inner wrapper keeps % hotspot positions in sync with the svg width */}
          <div className="relative w-full min-w-[760px]">
            <svg
              viewBox="0 0 1200 800"
              className="block w-full"
              role="img"
              aria-label={t('anatomy.svgAriaLabel')}
            >
              <rect width="1200" height="800" fill="#FFD900" />
              {/* piers → 银牌 */}
              <g data-part="pier" fill="none" style={partStyle('silver')}>
                <rect data-draw x="356" y="490" width="28" height="150" />
                <rect data-draw x="796" y="490" width="28" height="150" />
              </g>
              {/* towers → 钻石 */}
              <g data-part="tower" fill="none" style={partStyle('diamond')}>
                <rect data-draw x="356" y="200" width="28" height="300" />
                <rect data-draw x="796" y="200" width="28" height="300" />
              </g>
              {/* main cable + hangers → 铂金 */}
              <g data-part="cable" fill="none" style={partStyle('platinum')}>
                <path data-draw d="M100 260 L370 208 Q600 330 830 208 L1100 260" strokeLinecap="round" />
                <g strokeWidth={2.5}>
                  {HANGERS.map((d) => (
                    <path data-draw key={d} d={d} />
                  ))}
                </g>
              </g>
              {/* deck → 金牌 */}
              <g data-part="deck" fill="none" style={partStyle('gold')}>
                <rect data-draw x="100" y="470" width="1000" height="20" />
              </g>
              {/* water — static, not a bridge part */}
              <g fill="none" stroke="#141414" strokeWidth={3} strokeLinecap="round">
                <path d="M300 684 q16 -10 32 0 t32 0" />
                <path d="M820 684 q16 -10 32 0 t32 0" />
              </g>
            </svg>
            {/* hotspots: hand-drawn neat-annotations label + arrow pointing at a tier dot */}
            {TIERS.map((tier) => (
              <span
                key={tier.id}
                data-hotspot
                role="button"
                tabIndex={0}
                aria-label={t('anatomy.hotspotAria', { part: pick(tier.partCn, locale), name: pick(tier.name, locale) })}
                className="absolute -m-4 flex h-8 w-8 cursor-pointer items-center justify-center focus:outline-none"
                style={{ left: `${(tier.dot.cx / 1200) * 100}%`, top: `${(tier.dot.cy / 800) * 100}%` }}
                onMouseEnter={() => setActiveId(tier.id)}
                onClick={() => setActiveId(tier.id)}
                onFocus={() => setActiveId(tier.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveId(tier.id);
                  }
                }}
              >
                <span
                  className={`ann ${tier.ann} ann-no-mark block h-3 w-3 rounded-full border-[3px] border-ink transition-transform duration-200 ${
                    activeId === tier.id ? 'scale-125' : ''
                  }`}
                  data-note={`${pick(tier.partCn, locale)} · ${tier.en}`}
                  style={{ '--ann-color': tier.color, backgroundColor: tier.color, ...tier.annVars } as CSSProperties}
                />
              </span>
            ))}
          </div>
        </div>

        {/* detail card — crossfades on tier switch */}
        <div className="lg:col-span-3">
          <CableCard cable={false} className="p-7">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active.id}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -12, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.14em] text-ink/70">
                    <span className="inline-block h-3 w-3 shrink-0 border-2 border-ink" style={{ backgroundColor: active.color }} aria-hidden="true" />
                    {active.partEn} // {pick(active.partCn, locale)} · {pick(active.name, locale)}
                  </p>
                  <span className="shrink-0 rounded-full border-[2.5px] border-ink px-2.5 py-0.5 font-mono text-[11px] font-medium text-ink" style={{ backgroundColor: active.color }}>
                    {active.limit}
                  </span>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {active.benefits.map((b) => (
                    <li key={pick(b, locale)} className="flex gap-2.5 text-[15px] leading-relaxed text-paper-dim">
                      <span className="shrink-0 font-bold text-ink" aria-hidden="true">
                        ▸
                      </span>
                      {pick(b, locale)}
                    </li>
                  ))}
                </ul>
                <a
                  href={`mailto:${SITE.email}?subject=${encodeURIComponent(t('anatomy.mailSubject', { name: pick(active.name, locale) }))}`}
                  className="group mt-6 inline-flex items-center gap-2 font-mono text-sm font-medium uppercase tracking-[0.12em] text-ink"
                >
                  <span className="underline decoration-2 underline-offset-4">{t('anatomy.requestTier')}</span>
                  <span aria-hidden="true" className="inline-block transition-transform duration-300 group-hover:translate-x-1.5">
                    →
                  </span>
                </a>
              </motion.div>
            </AnimatePresence>
          </CableCard>
        </div>
      </div>
    </section>
  );
}
