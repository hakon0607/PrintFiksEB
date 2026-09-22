'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Videoen starter av seg selv når man scroller ned til den, og stopper når
 * man scroller forbi. Lyden er av (ellers stopper nettleseren autoplay).
 * Trykker man på videoen får man vanlige kontroller.
 */
export function VideoSpiller({
  src,
  webm,
  poster,
  tekst,
}: {
  src: string;
  webm?: string;
  poster?: string;
  tekst?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [spiller, setSpiller] = useState(false);
  const [kontroller, setKontroller] = useState(false);
  const [lyd, setLyd] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    const redusert = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (redusert) return;

    const obs = new IntersectionObserver(
      ([post]) => {
        if (post.isIntersecting) {
          v.play().catch(() => {
            /* nettleseren nektet – da får man trykke selv */
          });
        } else if (!v.paused) {
          v.pause();
        }
      },
      { threshold: 0.45 }
    );

    obs.observe(v);
    return () => obs.disconnect();
  }, []);

  const start = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    setKontroller(true);
    v.play().catch(() => undefined);
  }, []);

  function vekslLyd(e: React.MouseEvent) {
    e.stopPropagation();
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setLyd(!v.muted);
  }

  return (
    <figure className="group relative overflow-hidden rounded-[2rem] border border-ink-100 bg-ink-900 shadow-lift">
      <video
        ref={ref}
        poster={poster}
        controls={kontroller}
        loop
        muted
        playsInline
        preload="metadata"
        onPlay={() => setSpiller(true)}
        onPause={() => setSpiller(false)}
        className="aspect-video w-full object-cover"
      >
        {webm && <source src={webm} type="video/webm" />}
        <source src={src} type="video/mp4" />
      </video>

      {/* Overlegg før videoen har startet */}
      <AnimatePresence>
        {!spiller && !kontroller && (
          <motion.button
            type="button"
            onClick={start}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink-900/35 transition-colors hover:bg-ink-900/25"
            aria-label="Spill av videoen"
          >
            <motion.span
              whileHover={{ scale: 1.08 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-white/95 shadow-lift"
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M8 5.5v13l11-6.5z" fill="#2559C7" />
              </svg>
            </motion.span>
            {tekst && (
              <span className="rounded-full bg-ink-900/70 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
                {tekst}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Mens den spiller av seg selv: klikk for kontroller, og lyd-knapp */}
      {spiller && !kontroller && (
        <button
          type="button"
          onClick={start}
          className="absolute inset-0"
          aria-label="Vis avspillerkontroller"
        />
      )}

      {spiller && (
        <button
          type="button"
          onClick={vekslLyd}
          className="absolute bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-ink-900/70 text-white backdrop-blur transition-colors hover:bg-ink-900/90"
          aria-label={lyd ? 'Skru av lyden' : 'Skru på lyden'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {lyd ? (
              <path
                d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            ) : (
              <path d="m16 9.5 4 5m0-5-4 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            )}
          </svg>
        </button>
      )}
    </figure>
  );
}
