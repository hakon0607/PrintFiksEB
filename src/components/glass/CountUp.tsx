'use client';

import { useEffect, useRef, useState } from 'react';

/** Teller opp fra 0 når tallet kommer til syne. */
export function CountUp({ to, decimals = 0, delay = 0 }: { to: number; decimals?: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const fmt = (v: number) =>
    v.toLocaleString('nb-NO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const [val, setVal] = useState(fmt(to));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setVal(fmt(0));
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now() + delay;
        const tick = (t: number) => {
          const k = Math.min(1, Math.max(0, (t - t0) / 1400));
          setVal(fmt(to * (1 - Math.pow(1 - k, 4))));
          if (k < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, decimals, delay]);

  return <span ref={ref}>{val}</span>;
}
