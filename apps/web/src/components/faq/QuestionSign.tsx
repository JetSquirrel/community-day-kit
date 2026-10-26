import { memo, useRef } from 'react';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';

/**
 * faq.md §S1 — the big "?" road sign. Enters with back.out(1.8), then sways
 * ±2deg every ~5s like a sign in the wind — the ONLY looping motion on this
 * screen, isolated here and memoized so page re-renders never reset it.
 */
const QuestionSign = memo(function QuestionSign() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const el = ref.current!;
      gsap.from(el, { rotation: -8, scale: 0.8, opacity: 0, duration: 0.7, ease: 'back.out(1.8)', delay: 0.35 });
      gsap.fromTo(
        el,
        { rotation: 4 },
        { rotation: 8, duration: 1.2, ease: 'sine.inOut', repeat: -1, yoyo: true, repeatDelay: 3.8, delay: 1.2, immediateRender: false },
      );
    },
    { scope: ref },
  );

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="flex h-36 w-36 shrink-0 items-center justify-center rounded-lg border-[3px] border-ink bg-paper shadow-hard-lg md:h-40 md:w-40"
      style={{ rotate: '6deg' }}
    >
      <span className="font-display text-[104px] leading-none text-ink md:text-[120px]">?</span>
    </div>
  );
});

export default QuestionSign;
