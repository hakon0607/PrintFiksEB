'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

type Steg = { n: string; t: string; d: string };

/** De fire stegene: en linje tegnes mellom tallene mens man scroller. */
export function Steps({ steps }: { steps: Steg[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLElement>(null);
  const dot = useRef<HTMLElement>(null);
  const [aktive, setAktive] = useState(0);

  useEffect(() => {
    let raf = 0;
    let smooth = 0;
    const loop = () => {
      const el = wrap.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const h = window.innerHeight;
        const target = Math.min(1, Math.max(0, (h * 0.8 - r.top) / (h * 0.55)));
        smooth += (target - smooth) * 0.12;
        if (line.current) line.current.style.transform = `scaleX(${smooth})`;
        if (dot.current) {
          dot.current.style.left = `${smooth * 100}%`;
          dot.current.style.opacity = smooth > 0.01 && smooth < 0.99 ? '1' : '0';
        }
        const n = steps.filter((_, i) => smooth >= i / (steps.length - 1) - 0.02).length;
        setAktive((a) => (a === n ? a : n));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [steps]);

  return (
    <div ref={wrap} className="relative mt-12 grid gap-6 md:grid-cols-4">
      <div aria-hidden className="steps-line absolute left-0 right-0 top-7 hidden md:block">
        <i ref={line} />
        <b ref={dot} style={{ opacity: 0 }} />
      </div>
      {steps.map((steg, i) => (
        <motion.div
          key={steg.n}
          initial={{ opacity: 0, y: 22, filter: 'blur(6px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <span
            className={`step-num glass relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-brand-700 ${
              i < aktive ? 'on' : ''
            }`}
          >
            {steg.n}
          </span>
          <h3 className="mt-5 text-base font-semibold">{steg.t}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">{steg.d}</p>
        </motion.div>
      ))}
    </div>
  );
}
