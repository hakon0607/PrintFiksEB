'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Review } from '@/lib/types';

function Stjerner({ antall, stor = false }: { antall: number; stor?: boolean }) {
  const n = Math.max(0, Math.min(5, Math.round(antall || 0)));
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`${n} av 5 stjerner`}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <svg
          key={i}
          width={stor ? 20 : 16}
          height={stor ? 20 : 16}
          viewBox="0 0 24 24"
          aria-hidden
          className={i < n ? 'text-amber-400' : 'text-ink-200'}
        >
          <path
            fill="currentColor"
            d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.45 6.19 20.5 7.3 14.03 2.6 9.45l6.5-.95L12 2.6z"
          />
        </svg>
      ))}
    </span>
  );
}

export function Anmeldelser({
  anmeldelser,
  tittel,
  undertittel,
  sekunder,
}: {
  anmeldelser: Review[];
  tittel: string;
  undertittel: string;
  sekunder: number;
}) {
  const roligere = useReducedMotion();
  const [na, setNa] = useState(0);
  const [pause, setPause] = useState(false);
  const berorX = useRef<number | null>(null);

  const antall = anmeldelser.length;
  const bytt = useCallback(
    (retning: number) => setNa((i) => (i + retning + antall) % antall),
    [antall]
  );

  const rullerer = antall > 1 && sekunder > 0 && !roligere;

  useEffect(() => {
    if (!rullerer || pause) return;
    const id = window.setInterval(() => bytt(1), sekunder * 1000);
    return () => window.clearInterval(id);
  }, [rullerer, pause, sekunder, bytt]);

  if (antall === 0) return null;

  const a = anmeldelser[Math.min(na, antall - 1)];

  return (
    <section className="relative overflow-hidden py-16 sm:py-24">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">
            <span className="relative h-1.5 w-1.5 rounded-full bg-amber-400" />
            Anmeldelser
          </span>
          <h2 className="mt-4 text-balance text-3xl font-bold sm:text-4xl">{tittel}</h2>
          {undertittel && (
            <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{undertittel}</p>
          )}
        </div>

        <div
          className="relative mx-auto mt-10 max-w-3xl"
          onMouseEnter={() => setPause(true)}
          onMouseLeave={() => setPause(false)}
          onFocusCapture={() => setPause(true)}
          onBlurCapture={() => setPause(false)}
          onTouchStart={(e) => {
            berorX.current = e.touches[0]?.clientX ?? null;
            setPause(true);
          }}
          onTouchEnd={(e) => {
            const start = berorX.current;
            const slutt = e.changedTouches[0]?.clientX ?? null;
            if (start !== null && slutt !== null && Math.abs(slutt - start) > 48) {
              bytt(slutt < start ? 1 : -1);
            }
            berorX.current = null;
            setPause(false);
          }}
        >
          <div className="glass relative overflow-hidden rounded-[28px] p-7 sm:p-10">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="absolute right-6 top-5 h-16 w-16 text-brand-100"
              fill="currentColor"
            >
              <path d="M9.6 6C6.5 6 4 8.6 4 11.8 4 14.9 6.2 17 9 17c.5 0 1-.1 1.4-.2-.6 1.7-2 3-3.8 3.6l.9 1.6c3.6-1.2 6.1-4.6 6.1-8.9C13.6 8.6 12 6 9.6 6zm10 0C16.5 6 14 8.6 14 11.8c0 3.1 2.2 5.2 5 5.2.5 0 1-.1 1.4-.2-.6 1.7-2 3-3.8 3.6l.9 1.6c3.6-1.2 6.1-4.6 6.1-8.9C23.6 8.6 22 6 19.6 6z" />
            </svg>

            <div className="relative min-h-[186px] sm:min-h-[168px]">
              <AnimatePresence mode="wait">
                <motion.blockquote
                  key={a.id}
                  initial={roligere ? { opacity: 0 } : { opacity: 0, y: 14 }}
                  animate={roligere ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  exit={roligere ? { opacity: 0 } : { opacity: 0, y: -14 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                  className="flex h-full flex-col justify-center"
                >
                  <Stjerner antall={a.stars} stor />
                  <p className="mt-4 text-pretty text-lg leading-relaxed text-ink-800 sm:text-xl">
                    {a.quote}
                  </p>
                  <footer className="pt-5 text-sm">
                    <span className="font-bold text-ink-900">{a.name || 'Kunde'}</span>
                    {a.place && <span className="text-ink-500"> · {a.place}</span>}
                  </footer>
                </motion.blockquote>
              </AnimatePresence>
            </div>
          </div>

          {antall > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => bytt(-1)}
                aria-label="Forrige anmeldelse"
                className="grid h-10 w-10 place-items-center rounded-full border border-ink-200 bg-white/80 text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-700"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div className="flex items-center gap-2">
                {anmeldelser.map((r, i) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setNa(i)}
                    aria-label={`Vis anmeldelse ${i + 1} av ${antall}`}
                    aria-current={i === na}
                    className={`h-2 rounded-full transition-all ${
                      i === na ? 'w-7 bg-brand-600' : 'w-2 bg-ink-200 hover:bg-ink-300'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => bytt(1)}
                aria-label="Neste anmeldelse"
                className="grid h-10 w-10 place-items-center rounded-full border border-ink-200 bg-white/80 text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-700"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
