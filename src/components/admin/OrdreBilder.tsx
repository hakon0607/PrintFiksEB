'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAdmin } from './AdminProvider';
import { BOTTE } from '@/lib/bestillingsbilder';
import { MAKS_BILDER, krympBilde } from '@/lib/bilde';

/**
 * Bildene som hører til en bestilling. Kunden legger dem ved når de
 * bestiller, og vi kan legge til selv når vi tar en bestilling på
 * telefonen. Klikk på et bilde for å se det stort.
 */

/** bestillingsbilder/1042/17...-1-ab12.jpg → stien inne i bøtta */
function stiFraUrl(url: string): string | null {
  const merke = `/${BOTTE}/`;
  const i = url.indexOf(merke);
  if (i < 0) return null;
  return url.slice(i + merke.length).split('?')[0];
}

export function OrdreBilder({
  ordreId,
  ordrenr,
  bilder,
  onChange,
}: {
  ordreId: string;
  ordrenr: string;
  bilder: string[];
  onChange: (nye: string[]) => void;
}) {
  const { supabase } = useAdmin();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stor, setStor] = useState<string | null>(null);
  const [jobber, setJobber] = useState(false);
  const [feil, setFeil] = useState('');

  async function lagre(nye: string[]) {
    if (!supabase) return;
    onChange(nye);
    const { error } = await supabase.from('orders').update({ bilder: nye }).eq('id', ordreId);
    if (error) setFeil('Klarte ikke å lagre. Last siden på nytt og prøv igjen.');
  }

  async function leggTil(e: React.ChangeEvent<HTMLInputElement>) {
    const filer = Array.from(e.target.files ?? []);
    if (inputRef.current) inputRef.current.value = '';
    if (filer.length === 0 || !supabase) return;

    setFeil('');
    setJobber(true);

    const plass = MAKS_BILDER - bilder.length;
    const lagt: string[] = [];

    for (const fil of filer.slice(0, plass)) {
      try {
        const krympet = await krympBilde(fil);
        const blob = await (await fetch(krympet.dataUrl)).blob();
        const mappe = (ordrenr || 'admin').replace(/[^\w-]/g, '');
        const navn = `${mappe}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error } = await supabase.storage.from(BOTTE).upload(navn, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });
        if (error) {
          setFeil('Klarte ikke å laste opp bildet.');
          continue;
        }
        lagt.push(supabase.storage.from(BOTTE).getPublicUrl(navn).data.publicUrl);
      } catch {
        setFeil('Klarte ikke å behandle bildet. Prøv et annet.');
      }
    }

    if (lagt.length > 0) await lagre([...bilder, ...lagt]);
    setJobber(false);
  }

  async function fjern(url: string) {
    if (!supabase) return;
    if (!window.confirm('Fjerne dette bildet? Det kan ikke angres.')) return;
    await lagre(bilder.filter((b) => b !== url));
    const sti = stiFraUrl(url);
    if (sti) await supabase.storage.from(BOTTE).remove([sti]);
  }

  const fullt = bilder.length >= MAKS_BILDER;

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-4">
      <p className="label">
        Bilder fra kunden{bilder.length > 0 ? ` (${bilder.length})` : ''}
      </p>

      <div className="flex flex-wrap items-start gap-3">
        {bilder.map((url, i) => (
          <div key={url} className="relative">
            <button
              type="button"
              onClick={() => setStor(url)}
              className="block overflow-hidden rounded-2xl border border-ink-200 transition-colors hover:border-brand-400"
              title="Klikk for å se stort"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Vedlegg ${i + 1} fra kunden`}
                className="h-28 w-28 object-cover"
              />
            </button>
            <button
              type="button"
              onClick={() => fjern(url)}
              aria-label={`Fjern bilde ${i + 1}`}
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-ink-200 bg-white text-sm font-bold text-ink-600 shadow-soft hover:border-red-300 hover:text-red-600"
            >
              ×
            </button>
          </div>
        ))}

        {!fullt && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={jobber}
            className="flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink-200 text-ink-500 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-60"
          >
            <span className="text-2xl leading-none">+</span>
            <span className="px-1 text-center text-[11px] font-semibold leading-tight">
              {jobber ? 'Laster opp…' : 'Legg til bilde'}
            </span>
          </button>
        )}
      </div>

      {bilder.length === 0 && (
        <p className="hint">
          Kunden la ikke ved bilder. Tar du bestillingen på telefonen, kan du legge til bilde selv
          – f.eks. av den ødelagte delen.
        </p>
      )}

      {feil && <p className="mt-2 text-xs font-semibold text-red-600">{feil}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={leggTil}
        className="hidden"
        aria-hidden
      />

      {/* Stort bilde */}
      <AnimatePresence>
        {stor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setStor(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 p-4"
          >
            <motion.div
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-full w-full max-w-3xl overflow-hidden rounded-3xl bg-white p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stor}
                alt="Vedlegg fra kunden"
                className="max-h-[70vh] w-full rounded-2xl object-contain"
              />
              <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-3">
                <a
                  href={stor}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13px] font-semibold text-brand-700 underline"
                >
                  Åpne i ny fane
                </a>
                <button type="button" onClick={() => setStor(null)} className="btn-ghost btn-sm">
                  Lukk
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
