'use client';

/** Viser hva typiske pepperkakeformer koster med prisene over – oppdateres mens du skriver. */
import { useCallback, useEffect, useState } from 'react';
import { lyttPaTabell } from '@/lib/realtime';
import { useAdmin } from './AdminProvider';
import { krTekst, OPPSETT_NOKLER, oppsettFra, pepperkakePris, prisForklaring } from '@/lib/pepperkake/pris';

const EKSEMPLER: [string, number][] = [
  ['Liten sirkel, 4 cm', 12.6],
  ['Hjerte, ca. 7 × 7 cm', 25],
  ['Pepperkakemann, ca. 8 cm', 35],
  ['Stjerne, ca. 12 cm', 55],
  ['Stor, ca. 20 × 20 cm', 80],
  ['Veldig kronglete, 20 cm', 140],
];

export function PepperkakePrisEksempler() {
  const { supabase } = useAdmin();
  const [verdier, setVerdier] = useState<Record<string, string>>({});

  const hent = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from('settings').select('key,value').in('key', Object.values(OPPSETT_NOKLER));
    const ny: Record<string, string> = {};
    for (const r of ((data as { key: string; value: string }[]) ?? [])) ny[r.key] = r.value;
    setVerdier(ny);
  }, [supabase]);

  useEffect(() => {
    hent();
    const t = window.setInterval(hent, 4000); // i tilfelle sanntid ikke er slått på
    const stopp = supabase ? lyttPaTabell(supabase, 'settings', () => hent()) : undefined;
    return () => { window.clearInterval(t); stopp?.(); };
  }, [hent, supabase]);

  const o = oppsettFra(verdier);
  return (
    <section className="rounded-3xl border border-ink-100 bg-white p-6 shadow-soft sm:p-7">
      <h2 className="text-lg font-semibold">Slik blir prisene på pepperkakeformer</h2>
      <p className="mt-1.5 max-w-xl text-sm text-ink-500">{prisForklaring(o)}</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {EKSEMPLER.map(([navn, cm]) => (
          <div key={navn} className="flex items-center justify-between rounded-2xl bg-ink-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink-800">{navn}</p>
              <p className="text-xs text-ink-500">ca. {cm} cm strek</p>
            </div>
            <p className="text-lg font-bold text-brand-700">{krTekst(pepperkakePris(cm, o))} kr</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-ink-500">
        Plasten koster oss omtrent 0,15 kr per cm strek (ca. 0,6 g PLA per cm). Prisfeltet på pepperkakeformen i
        Galleri brukes ikke – det er tallene her som gjelder.
      </p>
    </section>
  );
}
