'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { useAdmin } from './AdminProvider';

/** Flere bilder til én modell. Første bilde i hovedfeltet vises først på nettsiden. */
export function ImageListUpload({
  value,
  onChange,
  label = 'Flere bilder',
  help = 'Vis modellen fra flere vinkler, eller i bruk. Kunden kan bla mellom dem.',
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  help?: string;
}) {
  const { supabase } = useAdmin();
  const inputRef = useRef<HTMLInputElement>(null);
  const [laster, setLaster] = useState(false);
  const [feil, setFeil] = useState('');

  const bilder = Array.isArray(value) ? value : [];

  async function velg(e: React.ChangeEvent<HTMLInputElement>) {
    const filer = Array.from(e.target.files ?? []);
    if (!filer.length || !supabase) return;

    setLaster(true);
    setFeil('');
    const nye: string[] = [];

    for (const fil of filer.slice(0, 8)) {
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

    if (nye.length) onChange([...bilder, ...nye]);
    setLaster(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  function flytt(i: number, retning: -1 | 1) {
    const ny = [...bilder];
    const j = i + retning;
    if (j < 0 || j >= ny.length) return;
    [ny[i], ny[j]] = [ny[j], ny[i]];
    onChange(ny);
  }

  return (
    <div>
      <span className="label">{label}</span>

      {bilder.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2.5">
          {bilder.map((b, i) => (
            <li
              key={b + i}
              className="group relative h-24 w-28 overflow-hidden rounded-2xl border border-ink-200 bg-ink-50"
            >
              <Image src={b} alt="" fill sizes="112px" className="object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-ink-900/70 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => flytt(i, -1)}
                  disabled={i === 0}
                  className="rounded px-1.5 text-white disabled:opacity-30"
                  aria-label="Flytt til venstre"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => onChange(bilder.filter((_, k) => k !== i))}
                  className="rounded px-1.5 text-white hover:text-red-300"
                  aria-label="Fjern bildet"
                >
                  ✕
                </button>
                <button
                  type="button"
                  onClick={() => flytt(i, 1)}
                  disabled={i === bilder.length - 1}
                  className="rounded px-1.5 text-white disabled:opacity-30"
                  aria-label="Flytt til høyre"
                >
                  →
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={laster}
        className="btn-soft btn-sm"
      >
        {laster ? 'Laster opp…' : bilder.length ? 'Legg til flere bilder' : 'Last opp bilder'}
      </button>
      <p className="hint">{help}</p>
      {feil && <p className="mt-1.5 text-xs font-semibold text-red-600">{feil}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={velg}
        className="hidden"
        aria-hidden
      />
    </div>
  );
}
