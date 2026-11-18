'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/* useLayoutEffect on the server warns and does nothing; this picks the right
   one so the reset to zero happens before the browser paints, never after. */
const useIsomorphic = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Counts up to `value` the first time it is scrolled into view.
 *
 * The finished number is what renders on the server, so it is correct with no
 * JavaScript at all and correct for anyone who has asked for less motion. The
 * animation only ever subtracts from something already true — it never hides
 * the number waiting for a trigger that might not come.
 */
export default function CountUp({ value, duration = 1100, format }: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
}) {
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);

  useIsomorphic(() => {
    if (typeof window === 'undefined') return;
    const quiet = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (quiet || !('IntersectionObserver' in window) || value <= 0) return;
    setShown(0);
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (!el || done.current) return;
    const quiet = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (quiet || !('IntersectionObserver' in window) || value <= 0) { setShown(value); return; }

    let raf = 0;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        setShown(Math.round(easeOut(t) * value));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || done.current) return;
      done.current = true;
      io.disconnect();
      run();
    }, { threshold: 0.4 });

    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, duration]);

  return <span ref={ref}>{format ? format(shown) : shown.toLocaleString('en-IN')}</span>;
}
