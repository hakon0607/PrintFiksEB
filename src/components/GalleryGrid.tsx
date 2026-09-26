'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ProductCard, type Tetthet } from './ProductCard';
import type { Product } from '@/lib/types';

export function GalleryGrid({
  products,
  currency = 'kr',
}: {
  products: Product[];
  currency?: string;
}) {
  const kategorier = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category?.trim()) set.add(p.category.trim());
    });
    return ['Alle', ...[...set].sort((a, b) => a.localeCompare(b, 'nb'))];
  }, [products]);

  const [kategori, setKategori] = useState('Alle');
  const [sok, setSok] = useState('');

  // Hvor mange kort ved siden av hverandre på mobil. Huskes til neste gang.
  const [kolonner, setKolonner] = useState<Tetthet>(1);
  useEffect(() => {
    try {
      const lagret = Number(window.localStorage.getItem('printfikseb_kolonner'));
      if (lagret === 1 || lagret === 2 || lagret === 3) setKolonner(lagret);
    } catch {
      /* ikke kritisk */
    }
  }, []);

  function velgKolonner(n: Tetthet) {
    setKolonner(n);
    try {
      window.localStorage.setItem('printfikseb_kolonner', String(n));
    } catch {
      /* ikke kritisk */
    }
  }

  const filtrert = useMemo(() => {
    const q = sok.trim().toLowerCase();
    return products.filter((p) => {
      const passerKategori = kategori === 'Alle' || (p.category ?? '').trim() === kategori;
      if (!passerKategori) return false;
      if (!q) return true;
      return [p.name, p.description, p.code, p.material, p.category]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [products, kategori, sok]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {kategorier.length > 1 && (
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {kategorier.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKategori(k)}
                className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  kategori === k ? 'text-white' : 'border border-ink-200 bg-white text-ink-600 hover:border-brand-300'
                }`}
              >
                {kategori === k && (
                  <motion.span
                    layoutId="galleri-filter"
                    className="absolute inset-0 rounded-full bg-brand-600"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative">{k}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Bare på mobil – på større skjermer er det allerede 2 og 3 i bredden */}
          <div
            className="flex shrink-0 items-center gap-1 rounded-full border border-ink-200 bg-white p-1 sm:hidden"
            role="group"
            aria-label="Hvor mange modeller ved siden av hverandre"
          >
            {([1, 2, 3] as Tetthet[]).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => velgKolonner(n)}
                aria-pressed={kolonner === n}
                aria-label={`${n} i bredden`}
                className={`grid h-9 w-9 place-items-center rounded-full transition-colors ${
                  kolonner === n ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-50'
                }`}
              >
                <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden fill="currentColor">
                  {n === 1 && <rect x="2" y="2" width="14" height="14" rx="2.5" />}
                  {n === 2 && (
                    <>
                      <rect x="2" y="2" width="6" height="14" rx="2" />
                      <rect x="10" y="2" width="6" height="14" rx="2" />
                    </>
                  )}
                  {n === 3 && (
                    <>
                      <rect x="1.5" y="2" width="4" height="14" rx="1.5" />
                      <rect x="7" y="2" width="4" height="14" rx="1.5" />
                      <rect x="12.5" y="2" width="4" height="14" rx="1.5" />
                    </>
                  )}
                </svg>
              </button>
            ))}
          </div>

          <div className="relative flex-1 sm:w-64">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400"
          >
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
            <path d="m16 16 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={sok}
            onChange={(e) => setSok(e.target.value)}
            placeholder="Søk etter modell eller ID"
            className="field pl-10"
            aria-label="Søk i galleriet"
          />
          </div>
        </div>
      </div>

      {filtrert.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-ink-200 bg-white/70 px-6 py-16 text-center">
          <p className="text-lg font-semibold text-ink-800">Ingen modeller å vise her ennå</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
            Prøv et annet søk, eller bruk priskalkulatoren til å bestille noe helt eget. Vi lager det
            meste.
          </p>
        </div>
      ) : (
        <motion.div
          layout
          className={`mt-8 grid sm:grid-cols-2 lg:grid-cols-3 ${
            kolonner === 3
              ? 'grid-cols-3 gap-2.5 sm:gap-5'
              : kolonner === 2
                ? 'grid-cols-2 gap-3 sm:gap-5'
                : 'grid-cols-1 gap-5'
          }`}
        >
          <AnimatePresence mode="popLayout">
            {filtrert.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="h-full"
              >
                <ProductCard product={p} currency={currency} tetthet={kolonner} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
