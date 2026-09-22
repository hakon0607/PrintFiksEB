'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useAdmin } from './AdminProvider';

/**
 * Alle bildene til en modell i ett. Det første er hovedbildet, og
 * du kan gjøre hvilket som helst bilde til hovedbilde med ett trykk.
 */
export function BildeSett({
  hoved,
  andre,
  onChange,
  label = 'Bilder',
}: {
  hoved: string;
  andre: string[];
  onChange: (hoved: string, andre: string[]) => void;
  label?: string;
}) {
  const { supabase } = useAdmin();
  const inputRef = useRef<HTMLInputElement>(null);
  const [laster, setLaster] = useState(false);
  const [over, setOver] = useState(false);
  const [feil, setFeil] = useState('');

  const alle = [hoved, ...(Array.isArray(andre) ? andre : [])].filter(Boolean) as string[];

  function settAlle(liste: string[]) {
    onChange(liste[0] ?? '', liste.slice(1));
  }

  async function lastOpp(filer: File[]) {
    if (!filer.length || !supabase) return;
    setLaster(true);
    setFeil('');
    const nye: string[] = [];

    for (const fil of filer.slice(0, 10)) {
      if (fil.size > 8 * 1024 * 1024) {
        setFeil('Ett av bildene var over 8 MB og ble hoppet over.');
        continue;
      }
      const endelse = (fil.name.split('.').pop() || 'jpg').toLowerCase();
      const navn = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${endelse}`;
      const { error } = await supabase.storage.from('bilder').upload(navn, fil, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) {
        setFeil('Klarte ikke å laste opp alle bildene.');
        continue;
      }
      nye.push(supabase.storage.from('bilder').getPublicUrl(navn).data.publicUrl);
    }

    if (nye.length) settAlle([...alle, ...nye]);
    setLaster(false);
  }

  return (
    <div>
      <span className="label">{label}</span>

      {alle.length > 0 && (
        <ul className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {alle.map((b, i) => (
            <motion.li
              key={b + i}
              layout
              className={`group relative aspect-square overflow-hidden rounded-2xl border-2 bg-ink-50 ${
                i === 0 ? 'border-brand-500 ring-4 ring-brand-100' : 'border-ink-200'
              }`}
            >
              <Image src={b} alt="" fill sizes="160px" className="object-cover" />

              {i === 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-brand-600 px-2.5 py-1 text-[10px] font-bold text-white">
                  Hovedbilde
                </span>
              )}

              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-ink-900/75 p-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                {i !== 0 && (
                  <button
                    type="button"
                    onClick={() => settAlle([b, ...alle.filter((x) => x !== b)])}
                    className="rounded-lg bg-white/15 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/30"
                  >
                    Gjør til hovedbilde
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => settAlle(alle.filter((_, k) => k !== i))}
                  className="rounded-lg px-2 py-1 text-[11px] font-semibold text-white hover:text-red-300"
                >
                  Fjern
                </button>
              </div>
            </motion.li>
          ))}
        </ul>
      )}

      <div
        tabIndex={0}
        role="button"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        onPaste={(e) => {
          const filer = Array.from(e.clipboardData?.files ?? []).filter((f) =>
            f.type.startsWith('image/')
          );
          if (filer.length) {
            e.preventDefault();
            lastOpp(filer);
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const filer = Array.from(e.dataTransfer?.files ?? []).filter((f) =>
            f.type.startsWith('image/')
          );
          if (filer.length) lastOpp(filer);
        }}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 border-dashed px-5 py-6 text-center transition-colors focus:outline-none focus:ring-4 focus:ring-brand-100 ${
          over ? 'border-brand-500 bg-brand-50' : 'border-ink-200 bg-white hover:border-brand-300'
        }`}
      >
        <span className="text-sm font-semibold text-ink-700">
          {laster ? 'Laster opp…' : 'Velg bilder, dra dem hit, eller lim inn med Ctrl+V'}
        </span>
        <span className="text-xs text-ink-500">
          Det første bildet vises i galleriet. Trykk på et annet for å gjøre det til hovedbilde.
        </span>
      </div>

      {feil && <p className="mt-1.5 text-xs font-semibold text-red-600">{feil}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          lastOpp(Array.from(e.target.files ?? []));
          if (inputRef.current) inputRef.current.value = '';
        }}
        className="hidden"
        aria-hidden
      />
    </div>
  );
}
