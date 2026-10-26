import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

interface TrailPoint {
  x: number;
  y: number;
  t: number;
}

/**
 * Hero-only custom cursor (design.md §3): a 24px purple signal dot + a thin
 * fading wave trail (single wave, ~120ms tail, canvas). "You are the signal."
 * Disabled on touch devices and for reduced motion.
 */
export default function HeroCursor({ rootRef }: { rootRef: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const dot = dotRef.current;
    if (!root || !canvas || !dot) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let visible = false;
    const pos = { x: -100, y: -100 };
    const shown = { x: -100, y: -100 };
    const trail: TrailPoint[] = [];

    const resize = () => {
      const r = root.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(r.width));
      canvas.height = Math.max(1, Math.floor(r.height));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(root);

    const onMove = (e: MouseEvent) => {
      const r = root.getBoundingClientRect();
      pos.x = e.clientX - r.left;
      pos.y = e.clientY - r.top;
      visible = true;
    };
    const onLeave = () => {
      visible = false;
    };
    root.addEventListener('mousemove', onMove);
    root.addEventListener('mouseleave', onLeave);

    const frame = (now: number) => {
      // dot follows with a slight lerp
      shown.x += (pos.x - shown.x) * 0.35;
      shown.y += (pos.y - shown.y) * 0.35;
      dot.style.transform = `translate(${shown.x - 12}px, ${shown.y - 12}px)`;
      dot.style.opacity = visible ? '1' : '0';

      if (visible) trail.push({ x: shown.x, y: shown.y, t: now });
      while (trail.length && now - trail[0].t > 120) trail.shift();

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (trail.length > 1) {
        // single sine wave through the recent tail — the "signal trace"
        const age = (i: number) => 1 - (now - trail[i].t) / 120;
        ctx.beginPath();
        for (let i = 0; i < trail.length; i++) {
          const p = trail[i];
          const wobble = Math.sin(i * 0.9 + now / 40) * 4 * age(i);
          if (i === 0) ctx.moveTo(p.x, p.y + wobble);
          else ctx.lineTo(p.x, p.y + wobble);
        }
        ctx.strokeStyle = 'rgba(108, 63, 212, 0.65)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      root.removeEventListener('mousemove', onMove);
      root.removeEventListener('mouseleave', onLeave);
    };
  }, [rootRef]);

  return (
    <>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-20 max-md:hidden" aria-hidden="true" />
      <div
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-20 h-6 w-6 rounded-full border-2 border-ink bg-pulse opacity-0 transition-opacity duration-150 max-md:hidden"
      />
    </>
  );
}
