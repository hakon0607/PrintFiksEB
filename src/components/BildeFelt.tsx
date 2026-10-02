'use client';

import { useRef, useState } from 'react';
import { MAKS_BILDER, krympBilde, visStorrelse, type Krympet } from '@/lib/bilde';

/**
 * «Legg ved bilde» på bestillingsskjemaet. Bildene krympes i
 * nettleseren og sendes sammen med bestillingen – ingenting lastes
 * opp før kunden faktisk trykker send.
 */
export function BildeFelt({
  bilder,
  onChange,
}: {
  bilder: Krympet[];
  onChange: (nye: Krympet[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [jobber, setJobber] = useState(false);
  const [feil, setFeil] = useState('');

  async function velg(e: React.ChangeEvent<HTMLInputElement>) {
    const filer = Array.from(e.target.files ?? []);
    if (inputRef.current) inputRef.current.value = '';
    if (filer.length === 0) return;

    setFeil('');
    setJobber(true);

    const plass = MAKS_BILDER - bilder.length;
    const nye: Krympet[] = [];
    let avvist = '';

    for (const fil of filer.slice(0, plass)) {
      if (!fil.type.startsWith('image/')) {
        avvist = 'Vi tar bare imot bilder.';
        continue;
      }
      try {
        nye.push(await krympBilde(fil));
      } catch (e) {
        avvist =
          e instanceof Error ? e.message : 'Klarte ikke å behandle bildet. Prøv et annet.';
      }
    }

    if (filer.length > plass) {
      avvist = `Du kan legge ved ${MAKS_BILDER} bilder. Vi tok de ${plass === 1 ? 'første' : plass} som fikk plass.`;
    }

    if (nye.length > 0) onChange([...bilder, ...nye]);
    setFeil(avvist);
    setJobber(false);
  }

  const fullt = bilder.length >= MAKS_BILDER;

  return (
    <div>
      <span className="label">Legg ved bilde (valgfritt)</span>

      <div className="flex flex-wrap items-start gap-3">
        {bilder.map((b, i) => (
          <div key={`${b.navn}-${i}`} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.dataUrl}
              alt={`Vedlegg ${i + 1}`}
              className="h-24 w-24 rounded-2xl border border-ink-200 object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(bilder.filter((_, j) => j !== i))}
              aria-label={`Fjern bilde ${i + 1}`}
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-ink-200 bg-white text-sm font-bold text-ink-600 shadow-soft hover:border-red-300 hover:text-red-600"
            >
              ×
            </button>
            <span className="mt-1 block text-center text-[11px] text-ink-400">
              {visStorrelse(b.bytes)}
            </span>
          </div>
        ))}

        {!fullt && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={jobber}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink-200 text-ink-500 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-60"
          >
            <span className="text-2xl leading-none">+</span>
            <span className="px-1 text-center text-[11px] font-semibold leading-tight">
              {jobber ? 'Behandler…' : 'Velg bilde'}
            </span>
          </button>
        )}
      </div>

      <p className="hint">
        Har du mål, en skisse eller bilde av den ødelagte delen? Legg ved opptil {MAKS_BILDER}{' '}
        bilder, så ser vi med en gang hva du mener. Bildene blir mindre automatisk.
      </p>

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
