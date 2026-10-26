import { useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Calendar, MapPin } from 'lucide-react';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { SITE } from '@/lib/site';
import { useLocalePath } from '@/lib/locale';
import Memphis from '@/components/Memphis';
import HeroCursor from '@/components/home/HeroCursor';

const LINE1 = ['B', 'r', 'i', 'd', 'g', 'e'];
const LINE2_PRE = ['w', 'i', 't', 'h', '\u00A0'];
const LINE2_POST = ['g', 'n', 'a', 'l'];

/**
 * S1 Hero — one bridge moment: the blue arch with a signal pulse crossing.
 * Entrance: kicker wipe → char stagger → subtitle → chips/CTA → bridge rises.
 * Loop: signal pulse on the deck (SMIL inside hero-bridge.svg), scroll hint dot.
 */
export default function Hero() {
  const { t } = useTranslation('home');
  const lp = useLocalePath();
  const root = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const bridgeRef = useRef<HTMLDivElement>(null);
  const bridgeEnterRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLImageElement>(null);
  const pulseRef = useRef<HTMLSpanElement>(null);
  const navigate = useNavigate();
  // 彩蛋：三连击吉祥物进入文艺复兴页。计数在 2s 无点击后清零，避免路过式单击累积
  const eggClicksRef = useRef(0);
  const eggResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 揭幕转场：金环 + 夜幕，从吉祥物位置圆形展开
  const eggVeilRef = useRef<HTMLDivElement>(null);
  const eggRingRef = useRef<HTMLDivElement>(null);
  const eggBusyRef = useRef(false);

  const onMascotClick = () => {
    if (eggBusyRef.current) return;
    // 每次点击翻个跟头（只动 rotation/scale，不与躲避动画的 y 打架）
    gsap.to(mascotRef.current, { rotation: '+=360', scale: 1.15, duration: 0.5, ease: 'back.out(1.8)', overwrite: 'auto' });
    gsap.to(mascotRef.current, { scale: 1, duration: 0.3, delay: 0.5, overwrite: false });
    eggClicksRef.current += 1;
    if (eggResetRef.current) clearTimeout(eggResetRef.current);
    if (eggClicksRef.current >= 3) {
      eggClicksRef.current = 0;
      eggBusyRef.current = true;
      const target = lp('/renaissance');
      if (prefersReducedMotion()) {
        navigate(target);
        return;
      }
      // 揭幕：吉祥物大转身 → 金环荡开 → 文艺复兴的夜幕从它身上展开铺满全屏。
      // 夜幕渐变与 Renaissance 页背景一致，切路由时无缝衔接
      const r = mascotRef.current!.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const radius = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy)) * 1.1;
      gsap
        .timeline({ onComplete: () => navigate(target) })
        .to(mascotRef.current, { rotation: '+=720', scale: 1.6, duration: 0.7, ease: 'power2.in', overwrite: 'auto' }, 0)
        // 金环只在开头一闪而过：scale 放大时边框会同步变粗，铺满屏就是一道亮带，所以小幅度展开后尽快淡出
        .set(eggRingRef.current, { left: cx, top: cy }, 0)
        .fromTo(eggRingRef.current, { scale: 0, opacity: 0.9 }, { scale: 4, duration: 0.45, ease: 'power2.out' }, 0.1)
        .to(eggRingRef.current, { opacity: 0, duration: 0.25, ease: 'power1.out' }, 0.45)
        // 夜幕做成直径 2R 的圆形 div 从吉祥物位置 scale 展开；月晕靠 veil 自身的 box-shadow，
        // 随圆等比柔和发光，不会像边框那样变粗晃眼
        .set(eggVeilRef.current, { left: cx - radius, top: cy - radius, width: radius * 2, height: radius * 2 }, 0.25)
        .fromTo(eggVeilRef.current, { scale: 0 }, { scale: 1, duration: 1.5, ease: 'power2.inOut' }, 0.25);
      return;
    }
    eggResetRef.current = setTimeout(() => {
      eggClicksRef.current = 0;
    }, 2000);
  };

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        gsap.set(pulseRef.current, { display: 'none' });
        return;
      }
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('[data-hero-kicker]', { clipPath: 'inset(0 100% 0 0)', duration: 0.4, ease: 'power2.out' })
        .from('.hero-char', { y: 60, rotate: 4, opacity: 0, duration: 0.9, stagger: 0.03 }, '-=0.05')
        .from('[data-hero-sub]', { y: 30, opacity: 0, duration: 0.6 }, '-=0.45')
        .from('[data-hero-row]', { y: 24, opacity: 0, duration: 0.5, stagger: 0.1 }, '-=0.3')
        // 入场与滚动视差必须作用在内外两层元素上——同一元素的同一个 y 会让
        // 两个 tween 互相把对方中间态记成起止值，首屏位置错乱
        .from(bridgeEnterRef.current, { y: 120, duration: 0.8, ease: 'power2.out' }, '-=0.5');

      // 信号小球桥面巡逻 + 吉祥物躲避。球与跳必须在同一条时间线上，否则
      // 时钟漂移后“球到脚下时起跳”会对不上。球速匀速，x 7.8%→92.2%（对应
      // 原 SMIL 路径 M150 318 L1770 318），吉祥物在 65% 处 → 3.05s 到脚下，
      // 提前 0.1s 起跳，球正好从脚下穿过。
      const PULSE_DUR = 4.5;
      const dodge = () => {
        gsap
          .timeline()
          .to(mascotRef.current, { y: -36, duration: 0.16, ease: 'power2.out' })
          .to(mascotRef.current, { y: 0, duration: 0.34, ease: 'bounce.out' });
      };
      gsap
        .timeline({ repeat: -1, delay: 2 }) // 等入场动画演完再开始第一圈
        .fromTo(pulseRef.current, { left: '7.8%', opacity: 0 }, { left: '92.2%', duration: PULSE_DUR, ease: 'none' }, 0)
        .to(pulseRef.current, { opacity: 1, duration: 0.25, ease: 'none' }, 0)
        .to(pulseRef.current, { opacity: 0, duration: 0.35, ease: 'none' }, PULSE_DUR - 0.35)
        .call(dodge, [], 2.95);

      // parallax exit: text drifts up 0.15x, bridge sinks 0.4x
      gsap.to(textRef.current, {
        y: -110,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 0.4 },
      });
      gsap.to(bridgeRef.current, {
        y: 180,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 0.4 },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative flex min-h-[100dvh] cursor-none flex-col overflow-hidden bg-signal max-md:cursor-auto">
      <HeroCursor rootRef={root} />

      {/* Memphis: exactly 2 pieces, in whitespace */}
      <Memphis id="wave-1" className="pointer-events-none absolute right-[6%] top-[10%] h-14 w-24 max-md:h-10 max-md:w-16" />
      <Memphis id="dots-2" className="pointer-events-none absolute left-[3%] top-[14%] hidden h-12 w-16 md:block" />

      {/* text block — left 7 columns；容器 pointer-events-none 否则会盖住桥下层的吉祥物彩蛋点击区，可交互的行单独恢复 */}
      <div ref={textRef} className="pointer-events-none relative z-10 mx-auto w-full max-w-[1280px] flex-1 px-6 pt-[11vh] xl:px-12">
        <div className="max-w-[860px]">
          <p data-hero-kicker className="inline-flex items-center gap-2.5 font-mono text-[13px] font-medium uppercase tracking-[0.18em] text-ink">
            <span className="inline-block h-3 w-3 border-2 border-ink bg-pulse" />
            {t('hero.kicker')}
          </p>

          <h1 className="mt-7 font-display leading-[0.95] tracking-[-0.02em] text-ink text-[clamp(56px,10vw,128px)]">
            <span className="block">
              {LINE1.map((c, i) => (
                <span key={i} className="hero-char inline-block will-change-transform">
                  {c}
                </span>
              ))}
            </span>
            <span className="block">
              {LINE2_PRE.map((c, i) => (
                <span key={i} className="hero-char inline-block will-change-transform">
                  {c}
                </span>
              ))}
              {/* Signal: the dot of the "i" becomes the purple signal point */}
              <span className="hero-char inline-block will-change-transform">S</span>
              <span className="hero-char relative inline-block will-change-transform">
                ı
                <span
                  className="absolute left-1/2 top-[0.02em] h-[0.13em] w-[0.13em] -translate-x-1/2 rounded-full border-[0.02em] border-ink bg-pulse"
                  aria-hidden="true"
                />
              </span>
              {LINE2_POST.map((c, i) => (
                <span key={i} className="hero-char inline-block will-change-transform">
                  {c}
                </span>
              ))}
            </span>
          </h1>

          <p data-hero-sub className="mt-6 font-sans text-[clamp(24px,3.4vw,40px)] font-black tracking-[0.06em] text-ink">
            {t('common:site.nameCn')}
          </p>

          <div data-hero-row className="pointer-events-auto mt-8 flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2 rounded-full border-[3px] border-ink bg-paper px-4 py-2 font-mono text-sm font-medium">
              <Calendar size={14} strokeWidth={2.5} aria-hidden="true" /> {SITE.date} {SITE.weekday}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border-[3px] border-ink bg-paper px-4 py-2 font-mono text-sm font-medium">
              <MapPin size={14} strokeWidth={2.5} aria-hidden="true" /> {t('common:site.city')}
            </span>
          </div>

          <div data-hero-row className="pointer-events-auto mt-6 flex flex-wrap items-center gap-4">
            {SITE.registerUrl && (
              <a
                href={SITE.registerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border-[3px] border-ink bg-spark px-8 py-3.5 font-sans text-lg font-bold text-white shadow-hard transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-2"
              >
                {t('common:common.register')}
              </a>
            )}
            <Link
              to={lp('/schedule')}
              className="inline-flex items-center rounded-full border-[3px] border-ink bg-transparent px-8 py-3.5 font-sans text-lg font-bold text-ink shadow-hard transition-[transform,box-shadow,background-color] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-paper hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-2"
            >
              {t('hero.ctaSchedule')}
            </Link>
          </div>
        </div>
      </div>

      {/* scroll hint */}
      <div className="absolute bottom-[34%] right-[7%] z-10 hidden flex-col items-center gap-3 md:flex" aria-hidden="true">
        <span className="font-mono text-xs tracking-[0.18em] text-ink [writing-mode:vertical-rl]">{t('hero.scrollHint')}</span>
        <span className="relative block h-10 w-[2px] bg-ink/30">
          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-pulse animate-signal-drop" />
        </span>
      </div>

      {/* the bridge — full-bleed, bottom of screen */}
      <div ref={bridgeRef} className="pointer-events-none absolute inset-x-0 bottom-0 z-0 will-change-transform">
        <div ref={bridgeEnterRef}>
          {/* 包装层与桥图同宽（max(100%,900px) 居中），吉祥物与小球的百分比定位相对桥图本身 */}
          <div className="relative left-1/2 w-[max(100%,900px)] max-w-none -translate-x-1/2">
            <img src="/hero-bridge.svg" alt={t('hero.bridgeAlt')} className="block w-full" />
            {/* 桥面巡逻的信号小球（原 SMIL animateMotion，现由 GSAP 驱动以同步躲避） */}
            <span
              ref={pulseRef}
              aria-hidden="true"
              className="absolute bottom-[50.3%] left-[7.8%] block aspect-square w-[1.15%] translate-y-1/2 rounded-full border-[3px] border-ink bg-pulse"
            />
            {/* UG 吉祥物站在桥面上（原小人+机器人位置），随桥等比缩放；外层管定位、内层管跳跃，避免 GSAP 把 translate-x 烘焙成 px。三连击进入文艺复兴彩蛋 */}
            <span
              className="absolute bottom-[47.5%] left-[65%] block w-[9%] -translate-x-1/2 cursor-pointer pointer-events-auto"
              onClick={onMascotClick}
            >
              <img ref={mascotRef} src="/ug-mascot.webp" alt="" aria-hidden="true" className="block w-full will-change-transform" />
            </span>
          </div>
        </div>
      </div>

      {/* 彩蛋揭幕转场：金环荡开 + 文艺复兴夜幕从吉祥物位置圆形展开（z-100 盖过一切，含 Navbar） */}
      <div
        ref={eggRingRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[100] h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#E8C874] opacity-0"
        style={{ boxShadow: '0 0 24px rgba(232,200,116,0.5), inset 0 0 16px rgba(232,200,116,0.3)' }}
      />
      <div
        ref={eggVeilRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[99] rounded-full"
        style={{
          background: 'radial-gradient(100% 100% at 50% 100%, #3a2410 0%, #1b1030 45%, #0b0817 80%)',
          boxShadow: '0 0 90px 24px rgba(232,200,116,0.38)',
          transform: 'scale(0)',
          width: 0,
          height: 0,
        }}
      />
    </section>
  );
}
