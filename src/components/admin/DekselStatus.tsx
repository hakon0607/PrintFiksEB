'use client';

import { useCallback, useEffect, useState } from 'react';

type Status = { modeller: string[]; modellFeil?: string | null; utenAnalyse?: string[]; produktFinnes: boolean; produktPublisert: boolean };

/** Viser hva kundene faktisk ser av dekselet på nettsiden akkurat nå. */
export function DekselStatus() {
  const [s, setS] = useState<Status | null>(null);
  const [feil, setFeil] = useState('');

  const sjekk = useCallback(async () => {
    setFeil('');
    try {
      const res = await fetch('/api/deksel/status', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      setS(await res.json());
    } catch {
      setFeil('Fikk ikke svar fra nettsiden.');
    }
  }, []);

  useEffect(() => { sjekk(); }, [sjekk]);

  if (feil) return <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{feil}</p>;
  if (!s) return <div className="h-20 animate-pulse rounded-2xl bg-white/70" />;

  const rad = (ok: boolean, tekst: React.ReactNode) => (
    <li className="flex items-start gap-2.5">
      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`}>
        {ok ? '✓' : '!'}
      </span>
      <span>{tekst}</span>
    </li>
  );

  return (
    <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-ink-900">Dette ser kundene nå</p>
        <button type="button" onClick={sjekk} className="text-xs font-semibold text-brand-700 hover:underline">Sjekk igjen</button>
      </div>
      <ul className="mt-3 space-y-2 text-sm text-ink-700">
        {rad(
          s.produktFinnes,
          s.produktFinnes
            ? <>Dekselet ligger i galleriet{s.produktPublisert ? '' : ' (vises også før dere trykker «Publiser»)'}.</>
            : <>Dekselet finnes ikke som produkt eller er skjult. Opprett det under «1. Produktet», eller slå på bryteren.</>
        )}
        {s.modellFeil
          ? rad(false, <>Nettsiden får ikke lest mobilene: <span className="font-mono text-xs">{s.modellFeil}</span>. Kjør <span className="font-mono">supabase/deksel-sjekk.sql</span> i Supabase.</>)
          : rad(
              s.modeller.length > 0,
              s.modeller.length > 0
                ? <>Kundene kan velge: {s.modeller.join(', ')}.</>
                : <>Ingen mobiler er synlige for kunder. Last opp under «3. Mobiler», og sjekk at de står som «Synlig for kunder».</>
            )}
        {(s.utenAnalyse?.length ?? 0) > 0 &&
          rad(false, <>Disse mangler analysen og vises ikke: {s.utenAnalyse!.join(', ')}. Slett dem og last opp fila på nytt.</>)}
      </ul>
      {s.produktFinnes && (
        <a href="/galleri/deksel" target="_blank" rel="noreferrer" className="btn-ghost btn-sm mt-4">
          Åpne dekselet på nettsiden ↗
        </a>
      )}
    </div>
  );
}
