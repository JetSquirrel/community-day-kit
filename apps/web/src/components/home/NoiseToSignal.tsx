import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';

const WORDS = ['404', '???', 'ERROR', 'COPY', '#%@!', 'Lorem'];
const COLORS = ['#141414', '#FF4D3D', '#2B5CE6'];

type Shape = 'tri' | 'sq' | 'zig' | 'dot';

interface Shard {
  shape: Shape;
  word?: string;
  x: number; // scattered %
  y: number;
  rot: number;
  color: string;
  tx: number; // target on the sine line (px in 640 box)
  ty: number;
}

function seeded(i: number) {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/** S3 — Noise → Signal → Bridge. GSAP pinned scrub narrative (motion ②). */
export default function NoiseToSignal() {
  const { t } = useTranslation('home');
  const root = useRef<HTMLElement>(null);
  // reduced motion or small screens: show the final wave state, no pin/scrub
  const reduced = useMemo(() => prefersReducedMotion(), []);

  const shards = useMemo<Shard[]>(() => {
    const list: Shard[] = [];
    for (let i = 0; i < 20; i++) {
      const tx = 60 + i * 26;
      const ty = 320 + Math.sin((i / 19) * Math.PI * 2.2) * 46;
      list.push({
        shape: (['tri', 'sq', 'zig', 'dot'] as Shape[])[i % 4],
        x: 6 + seeded(i) * 82,
        y: 8 + seeded(i + 40) * 80,
        rot: seeded(i + 80) * 140 - 70,
        color: COLORS[i % 3],
        tx,
        ty,
      });
    }
    return list;
  }, []);

  useGSAP(
    () => {
      if (reduced) return;
      const mm = gsap.matchMedia();
      mm.add('(min-width: 1024px)', () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: '+=150%',
            pin: true,
            scrub: 0.5,
            anticipatePin: 1,
          },
        });

        // left copy enters early
        tl.from('[data-ns-title]', { y: 40, opacity: 0, duration: 0.15 }, 0.15);
        tl.from('[data-ns-body]', { y: 24, opacity: 0, duration: 0.15 }, 0.35);
        tl.from('[data-ns-meta]', { opacity: 0, duration: 0.12 }, 0.5);

        // 0 → 0.6: shards converge onto the sine line, colors unify to purple
        tl.to(
          '.ns-shard',
          {
            left: (i) => `${(shards[i].tx / 640) * 100}%`,
            top: (i) => `${(shards[i].ty / 640) * 100}%`,
            rotate: 0,
            scale: 0.72,
            duration: 0.6,
            ease: 'power2.inOut',
            stagger: { each: 0.006, from: 'random' },
          },
          0,
        );
        tl.to('.ns-shape', { backgroundColor: '#6C3FD4', borderColor: '#6C3FD4', duration: 0.5, stagger: { each: 0.005, from: 'random' } }, 0.08);
        tl.to('.ns-word', { opacity: 0, duration: 0.1, stagger: 0.016 }, 0.12);

        // crisp final wave drawn on top
        tl.fromTo('.ns-wave', { strokeDasharray: 900, strokeDashoffset: 900 }, { strokeDashoffset: 0, duration: 0.3, ease: 'power1.inOut' }, 0.5);
        tl.to('.ns-shard', { opacity: 0, duration: 0.08, stagger: 0.004 }, 0.62);

        // 0.6 → 1: the signal becomes a bridge line, pulse crosses it
        tl.fromTo('.ns-bridge', { strokeDasharray: 320, strokeDashoffset: 320 }, { strokeDashoffset: 0, duration: 0.22, ease: 'power1.out' }, 0.68);
        tl.fromTo('.ns-pulse', { opacity: 0, left: '90.5%' }, { opacity: 1, left: '99.5%', duration: 0.18, ease: 'none' }, 0.8);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative overflow-hidden bg-paper">
      <div className="mx-auto grid min-h-[100dvh] max-w-[1280px] grid-cols-1 items-center gap-10 px-6 py-20 lg:grid-cols-12 xl:px-12">
        {/* left copy — 5 cols */}
        <div className="lg:col-span-5">
          <p className="inline-flex items-center gap-2.5 font-mono text-[13px] font-medium uppercase tracking-[0.18em] text-ink">
            <span className="inline-block h-3 w-3 border-2 border-ink bg-pulse" />
            SIG.00 // THE STORY
          </p>
          <h2 data-ns-title className="mt-5 font-sans text-[clamp(30px,4vw,40px)] font-black leading-tight text-ink">
            {t('story.title')}
          </h2>
          <p data-ns-body className="mt-5 max-w-[460px] text-base leading-[1.75] text-paper-dim md:text-lg">
            {t('story.body')}
          </p>
          <p data-ns-meta className="mt-6 font-mono text-xs tracking-[0.14em] text-ink/60">
            SIGNAL OVER NOISE (2026.06) → BRIDGE WITH SIGNAL (2026.10)
          </p>
        </div>

        {/* right canvas — 7 cols */}
        <div className="lg:col-span-7">
          <div className="relative mx-auto aspect-square w-full max-w-[640px]">
            {/* shards */}
            {shards.map((s, i) => (
              <span
                key={i}
                className={reduced ? 'ns-shard absolute hidden' : 'ns-shard absolute hidden lg:block'}
                style={{ left: `${s.x}%`, top: `${s.y}%`, transform: `rotate(${s.rot}deg)` }}
                aria-hidden="true"
              >
                {s.shape === 'tri' && (
                  <span
                    className="ns-shape block h-0 w-0 border-x-[9px] border-b-[15px] border-x-transparent"
                    style={{ borderBottomColor: s.color }}
                  />
                )}
                {s.shape === 'sq' && <span className="ns-shape block h-[15px] w-[15px]" style={{ backgroundColor: s.color }} />}
                {s.shape === 'zig' && (
                  <svg width="26" height="12" viewBox="0 0 26 12" className="ns-shape block" style={{ color: s.color }}>
                    <path d="M1 10 L6 3 L11 10 L16 3 L21 10 L25 4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                )}
                {s.shape === 'dot' && <span className="ns-shape block h-[13px] w-[13px] rounded-full" style={{ backgroundColor: s.color }} />}
              </span>
            ))}
            {/* noise words */}
            {WORDS.map((w, i) => (
              <span
                key={w}
                className={reduced ? 'ns-word absolute hidden' : 'ns-word absolute hidden font-mono text-sm font-medium text-ink/70 lg:block'}
                style={{ left: `${12 + seeded(i + 200) * 70}%`, top: `${14 + seeded(i + 260) * 68}%` }}
                aria-hidden="true"
              >
                {w}
              </span>
            ))}

            {/* final state: sine wave + bridge line + pulse */}
            <svg viewBox="0 0 640 640" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <path
                className="ns-wave"
                d="M60 320 Q92.5 274 125 320 T190 320 T255 320 T320 320 T385 320 T450 320 T515 320 T580 320"
                fill="none"
                stroke="#6C3FD4"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                className="ns-bridge"
                d="M580 320 H596 Q612 300 628 300 H640"
                fill="none"
                stroke="#141414"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <span
              className="ns-pulse absolute left-[90.5%] top-[46.9%] h-3 w-3 rounded-full border-2 border-ink bg-pulse opacity-100"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
