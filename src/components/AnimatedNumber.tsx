'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Teller seg opp eller ned til et nytt tall.
 * Bytter du raskt fram og tilbake, hopper den til riktig tall i stedet for å henge igjen.
 */
export function AnimatedNumber({ value, duration = 450 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const visesRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const fra = visesRef.current;
    const til = value;

    if (fra === til) {
      // Allerede riktig – ingenting å animere
      return;
    }

    // Har brukeren skrudd av animasjoner, eller er spranget bittelite? Bare sett tallet.
    const reduser =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduser || duration <= 0) {
      visesRef.current = til;
      setDisplay(til);
      return;
    }

    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const na = t >= 1 ? til : Math.round(fra + (til - fra) * eased);
      visesRef.current = na;
      setDisplay(na);
      rafRef.current = t < 1 ? requestAnimationFrame(tick) : null;
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [value, duration]);

  // Sikkerhetsnett: skulle animasjonen bli avbrutt, viser vi riktig tall likevel
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (visesRef.current !== value) {
        visesRef.current = value;
        setDisplay(value);
      }
    }, duration + 80);
    return () => window.clearTimeout(id);
  }, [value, duration]);

  return <>{Math.round(display).toLocaleString('nb-NO').replace(/ /g, ' ')}</>;
}
