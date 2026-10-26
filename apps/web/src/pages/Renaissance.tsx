import { useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';

/**
 * 彩蛋页 — The Renaissance（主页三连击吉祥物进入，不进导航、路由独立无 chrome）。
 * 主题致敬 Shopify Editions Winter '26 的文艺复兴叙事：古典衬线 + 鎏金 + 星空烛光。
 * 文案只做精神关联（拉斯维加斯那场文艺复兴 keynote → 本届大会是其延续），
 * 不承诺任何嘉宾出席——不做「谜底揭晓」式暗示。
 */

const COPY = {
  zh: {
    kicker: '你发现了彩蛋 · ARCANA · MMXXVI',
    titlePre: 'The ',
    titleEm: 'Ren',
    titleMid: 'ais',
    titleEm2: 'sance',
    titleCn: '文 艺 复 兴',
    lead: '五百年前，佛罗伦萨的匠人重新发现了光。今天，云端的建造者，正在做同样的事。',
    placard: '建造者肖像 · Portrait of a Builder, c. MMXXVI',
    riddleTitle: '一段回响',
    riddles: [
      '去年冬天，拉斯维加斯。数万人听过一场以「文艺复兴」为题的主题演讲。',
      '演讲者相信——每一位建造者，都是这个时代的达芬奇。',
      '2026.10.17 · 深圳。这座桥，也是文艺复兴的一部分。',
    ],
    answer: '致每一位建造者：文艺复兴，未完待续。',
    back: '← 回到桥上',
    numerals: ['I', 'II', 'III'],
  },
  en: {
    kicker: 'You found the easter egg · ARCANA · MMXXVI',
    titlePre: 'The ',
    titleEm: 'Ren',
    titleMid: 'ais',
    titleEm2: 'sance',
    titleCn: '文艺复兴 · The Renaissance',
    lead: 'Five centuries ago, the artisans of Florence rediscovered light. Today, the builders of the cloud are doing the same.',
    placard: 'Portrait of a Builder, c. MMXXVI',
    riddleTitle: 'An Echo',
    riddles: [
      'Last winter, in Las Vegas, tens of thousands heard a keynote titled "Renaissance".',
      'Its speaker believes every builder is a da Vinci of this age.',
      'On 2026.10.17 in Shenzhen, this bridge becomes part of that Renaissance.',
    ],
    answer: 'To every builder: the Renaissance is to be continued.',
    back: '← Back to the bridge',
    numerals: ['I', 'II', 'III'],
  },
} as const;

/** 确定性伪随机——星空位置在每次渲染间稳定，不依赖 Math.random */
function seeded(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const STARS = Array.from({ length: 56 }, (_, i) => ({
  left: seeded(i, 1) * 100,
  top: seeded(i, 2) * 100,
  size: 1 + seeded(i, 3) * 2.2,
  delay: seeded(i, 4) * 4,
  dur: 2.4 + seeded(i, 5) * 3.2,
}));

export default function Renaissance() {
  const { pathname } = useLocation();
  const c = /^\/en(\/|$)/.test(pathname) ? COPY.en : COPY.zh;
  const backTo = /^\/en(\/|$)/.test(pathname) ? '/en' : '/';
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from('[data-ren="kicker"]', { opacity: 0, letterSpacing: '0.6em', duration: 0.9 })
        .from('[data-ren="title"]', { y: 50, opacity: 0, duration: 1 }, '-=0.5')
        .from('[data-ren="lead"]', { y: 24, opacity: 0, duration: 0.7 }, '-=0.55')
        .from('[data-ren="frame"]', { scale: 0.85, opacity: 0, duration: 0.9, ease: 'back.out(1.4)' }, '-=0.4')
        .from('[data-ren="riddle"]', { y: 24, opacity: 0, duration: 0.6, stagger: 0.14 }, '-=0.45')
        .from('[data-ren="back"]', { opacity: 0, duration: 0.5 }, '-=0.2');
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      className="relative min-h-[100dvh] overflow-hidden font-serif text-[#EFE6D0]"
      style={{ background: 'radial-gradient(120% 90% at 50% 110%, #3a2410 0%, #1b1030 42%, #0b0817 78%)' }}
    >
      {/* 星光闪烁 keyframes（彩蛋页自包含，不进全局配置） */}
      <style>{`@keyframes ren-twinkle{0%,100%{opacity:.15}50%{opacity:.9}}`}</style>

      {/* 星空 */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {STARS.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-[#E8C874]"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              animation: `ren-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* 烛光晕 */}
      <div
        className="pointer-events-none absolute left-1/2 top-[62%] h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        aria-hidden="true"
        style={{ background: 'radial-gradient(circle, rgba(232,200,116,0.16) 0%, rgba(232,200,116,0) 62%)' }}
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[880px] flex-col items-center px-6 py-16 text-center md:py-20">
        <p data-ren="kicker" className="font-mono text-xs uppercase tracking-[0.34em] text-[#C9A227]">
          {c.kicker}
        </p>

        <h1 data-ren="title" className="mt-8 leading-[0.95]">
          <span className="block text-[clamp(52px,11vw,120px)] font-medium tracking-[-0.01em] text-[#F4EBD3]">
            {c.titlePre}
            <em className="text-[#E8C874]">{c.titleEm}</em>
            {c.titleMid}
            <em className="text-[#E8C874]">{c.titleEm2}</em>
          </span>
          <span className="mt-5 block text-[clamp(20px,3.2vw,32px)] font-semibold tracking-[0.5em] text-[#C9A227]">
            {c.titleCn}
          </span>
        </h1>

        <p data-ren="lead" className="mt-8 max-w-[560px] text-[clamp(17px,2.2vw,21px)] italic leading-relaxed text-[#D8CBA8]">
          {c.lead}
        </p>

        {/* 鎏金画框里的吉祥物“油画” */}
        <figure data-ren="frame" className="mt-12">
          <div className="border-[3px] border-[#C9A227] bg-[#141021] p-2.5 shadow-[0_0_60px_rgba(201,162,39,0.25)]">
            <div className="border border-[#C9A227]/60 p-3">
              <img
                src="/ug-mascot.webp"
                alt={c.placard}
                className="w-[clamp(160px,26vw,240px)]"
                style={{ filter: 'sepia(0.55) contrast(1.05) saturate(0.9)' }}
              />
            </div>
          </div>
          <figcaption className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-[#C9A227]/80">
            {c.placard}
          </figcaption>
        </figure>

        {/* 回响——罗马数字编号的三段文艺复兴关联 */}
        <section className="mt-14 w-full max-w-[640px] border border-[#C9A227]/40 bg-[#0b0817]/50 px-7 py-9 md:px-12">
          <h2 data-ren="riddle" className="font-mono text-xs uppercase tracking-[0.34em] text-[#C9A227]">
            {c.riddleTitle}
          </h2>
          <ol className="mt-7 space-y-6 text-left">
            {c.riddles.map((line, i) => (
              <li data-ren="riddle" key={i} className="flex items-baseline gap-5">
                <span className="shrink-0 text-lg italic text-[#E8C874]">{c.numerals[i]}.</span>
                <span className="text-[clamp(16px,2vw,19px)] leading-relaxed text-[#EFE6D0]">{line}</span>
              </li>
            ))}
          </ol>
          <p data-ren="riddle" className="mt-9 text-[clamp(18px,2.4vw,22px)] italic text-[#E8C874]">
            {c.answer}
          </p>
        </section>

        <Link
          data-ren="back"
          to={backTo}
          className="mt-14 inline-block border border-[#C9A227]/60 px-8 py-3 text-sm tracking-[0.2em] text-[#E8C874] transition-colors hover:bg-[#C9A227]/10"
        >
          {c.back}
        </Link>
      </div>
    </div>
  );
}
