'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TemaIkon } from './TemaPynt';
import type { TemaId } from '@/lib/temaer';

export type KategoriValg = {
  verdi: string;
  navn: string;
  antall: number;
  tema?: TemaId | null;
  sesong?: boolean;
};

/**
 * Én nedtrekksmeny for alle kategoriene. Holder seg ryddig uansett hvor
 * mange kategorier dere legger til. Tastatur: piltaster, Enter og Escape.
 */
export function KategoriMeny({
  valg,
  verdi,
  onVelg,
}: {
  valg: KategoriValg[];
  verdi: string;
  onVelg: (verdi: string) => void;
}) {
  const [apen, setApen] = useState(false);
  const [aktiv, setAktiv] = useState(0);
  const rot = useRef<HTMLDivElement>(null);
  const liste = useRef<HTMLUListElement>(null);
  const id = useId();
  const valgt = valg.find((v) => v.verdi === verdi) ?? valg[0];

  // lukk ved klikk utenfor
  useEffect(() => {
    if (!apen) return;
    function klikk(e: MouseEvent) {
      if (rot.current && !rot.current.contains(e.target as Node)) setApen(false);
    }
    document.addEventListener('mousedown', klikk);
    return () => document.removeEventListener('mousedown', klikk);
  }, [apen]);

  useEffect(() => {
    if (apen) {
      setAktiv(Math.max(0, valg.findIndex((v) => v.verdi === verdi)));
      window.setTimeout(() => liste.current?.focus(), 0);
    }
  }, [apen, valg, verdi]);

  function velg(v: string) {
    onVelg(v);
    setApen(false);
  }

  function tast(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setApen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!apen) setApen(true);
      else setAktiv((a) => Math.min(valg.length - 1, a + 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAktiv((a) => Math.max(0, a - 1));
    }
    if ((e.key === 'Enter' || e.key === ' ') && apen) {
      e.preventDefault();
      velg(valg[aktiv].verdi);
    }
  }

  return (
    <div ref={rot} className="relative w-full sm:w-80" onKeyDown={tast}>
      <button
        type="button"
        onClick={() => setApen((a) => !a)}
        aria-haspopup="listbox"
        aria-expanded={apen}
        aria-controls={id}
        className="flex w-full items-center gap-2.5 rounded-2xl border border-ink-200 bg-white px-4 py-3 text-left text-sm font-semibold text-ink-800 shadow-soft transition-colors hover:border-brand-300"
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">
          Kategori
        </span>
        {valgt.tema && <TemaIkon tema={valgt.tema} />}
        <span className="min-w-0 flex-1 truncate">{valgt.navn}</span>
        <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[11px] font-bold text-ink-500">
          {valgt.antall}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className={`shrink-0 text-ink-400 transition-transform ${apen ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {apen && (
          <motion.ul
            ref={liste}
            id={id}
            role="listbox"
            tabIndex={-1}
            aria-activedescendant={`${id}-${aktiv}`}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="solid-hvit absolute left-0 right-0 z-40 mt-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-ink-200 bg-white p-1.5 shadow-lift outline-none"
          >
            {valg.map((v, i) => {
              const erValgt = v.verdi === verdi;
              const forsteTema = v.tema && !valg[i - 1]?.tema;
              const forsteVanlige = !v.tema && i > 0 && valg[i - 1]?.tema;
              return (
                <li key={v.verdi} role="presentation">
                  {(forsteTema || forsteVanlige) && (
                    <p className="px-3 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">
                      {forsteTema ? 'Sesong' : 'Kategorier'}
                    </p>
                  )}
                  <button
                    id={`${id}-${i}`}
                    type="button"
                    role="option"
                    aria-selected={erValgt}
                    onClick={() => velg(v.verdi)}
                    onMouseEnter={() => setAktiv(i)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                      i === aktiv ? 'bg-brand-50' : ''
                    } ${erValgt ? 'font-bold text-brand-700' : 'font-semibold text-ink-700'}`}
                  >
                    {v.tema ? (
                      <TemaIkon tema={v.tema} className="h-5 w-5 shrink-0" />
                    ) : (
                      <span className="h-5 w-5 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{v.navn}</span>
                    {v.sesong && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Nå
                      </span>
                    )}
                    <span className="text-xs font-semibold text-ink-400">{v.antall}</span>
                    {erValgt && (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden className="text-brand-600">
                        <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
