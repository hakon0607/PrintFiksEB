'use client';

import { useEffect, useRef } from 'react';

/** Alle bildene fra print-videoen ligger i ett stort bilde (10 per rad). */
const SPRITE = '/video/printing-sprite.jpg';
const ANTALL = 153;
const KOLONNER = 10;
const BW = 560;
const BH = 316;

/**
 * Mørk boks med print-videoen i bakgrunnen. Videoen spoles fram og tilbake
 * etter hvor langt man har scrollet, og boksen vokser litt når den kommer inn.
 */
export function ScrollVideo({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const pct = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = cv.current;
    const el = box.current;
    if (!canvas || !el) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const sprite = new Image();
    sprite.decoding = 'async';
    let lastetInn = false;
    let last = -1;
    let fi = 0;
    let raf = 0;

    // Last bildet først når boksen nærmer seg
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !lastetInn) {
          lastetInn = true;
          sprite.src = SPRITE;
        }
      },
      { rootMargin: '800px' },
    );
    io.observe(el);

    const fit = () => {
      const d = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * d;
      canvas.height = canvas.clientHeight * d;
      last = -1;
    };
    const draw = (n: number) => {
      if (!sprite.complete || !sprite.naturalWidth) return false;
      const sx = (n % KOLONNER) * BW;
      const sy = Math.floor(n / KOLONNER) * BH;
      const cw = canvas.width;
      const ch = canvas.height;
      const s = Math.max(cw / BW, ch / BH);
      const w = BW * s;
      const h = BH * s;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(sprite, sx, sy, BW, BH, (cw - w) / 2, (ch - h) / 2, w, h);
      return true;
    };

    const loop = () => {
      const r = el.getBoundingClientRect();
      const H = window.innerHeight;
      if (r.top < H && r.bottom > 0) {
        const k = Math.min(1, Math.max(0, (H - r.top) / (H + r.height * 0.2)));
        const g = Math.min(1, Math.max(0, (H - r.top) / (H * 0.7)));
        if (!reduce) {
          el.style.transform = `scale(${0.9 + g * 0.1})`;
          el.style.borderRadius = `${48 - g * 16}px`;
        }
        fi += (k * (ANTALL - 1) - fi) * 0.18;
        const n = Math.round(fi);
        if (n !== last && draw(n)) last = n;
        if (pct.current) pct.current.textContent = String(Math.round(k * 100));
        if (bar.current) bar.current.style.width = `${k * 100}%`;
      }
      raf = requestAnimationFrame(loop);
    };

    fit();
    window.addEventListener('resize', fit);
    raf = requestAnimationFrame(loop);
    return () => {
      io.disconnect();
      window.removeEventListener('resize', fit);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={box}
      className="relative overflow-hidden rounded-[2rem] bg-[#0B0E14] px-7 py-14 text-center will-change-transform sm:px-14"
    >
      <canvas
        ref={cv}
        aria-hidden
        className="absolute inset-0 h-full w-full opacity-75"
        style={{ filter: 'saturate(.8) contrast(1.05) brightness(.9)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(40rem 18rem at 20% 0%, rgba(61,118,241,0.45), transparent 62%), radial-gradient(34rem 18rem at 85% 100%, rgba(37,89,199,0.4), transparent 60%)',
        }}
      />
      <div className="absolute left-5 top-4 z-10 flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-300 backdrop-blur-md">
        <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
        Printes nå · <span ref={pct}>0</span>%
      </div>
      <div className="cta-glass relative mx-auto max-w-2xl px-6 py-10 sm:px-8">{children}</div>
      <div ref={bar} aria-hidden className="absolute bottom-0 left-0 h-[3px] w-0 bg-gradient-to-r from-brand-400 to-brand-200" />
    </div>
  );
}
