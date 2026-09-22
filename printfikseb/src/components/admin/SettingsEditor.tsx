'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { lyttPaTabell } from '@/lib/realtime';
import { useAdmin } from './AdminProvider';
import { FeltRedigerer, StatusMerke, type Felt } from './TableEditor';
import type { Setting } from '@/lib/types';

export function SettingsEditor({
  grupper,
  beskrivelser,
}: {
  grupper: string[];
  beskrivelser?: Record<string, string>;
}) {
  const { supabase } = useAdmin();
  const [rader, setRader] = useState<Setting[]>([]);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState('');

  const hent = useCallback(async () => {
    if (!supabase) return;
    setLaster(true);
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .in('gruppe', grupper)
      .order('sort');
    if (error) setFeil('Klarte ikke å hente innstillingene. Last siden på nytt.');
    else setRader((data as Setting[]) ?? []);
    setLaster(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, grupper.join('|')]);

  useEffect(() => {
    hent();
  }, [hent]);

  // Skriver noen andre en tekst, dukker den opp her med en gang
  useEffect(() => {
    if (!supabase) return;
    return lyttPaTabell(supabase, 'settings', ({ ny }) => {
      if (!ny?.key) return;
      setRader((prev) =>
        prev.map((r) => (r.key === ny.key ? { ...r, ...(ny as unknown as Setting) } : r))
      );
    });
  }, [supabase]);

  if (laster) {
    return (
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-3xl bg-white/70" />
        ))}
      </div>
    );
  }

  if (feil) {
    return <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{feil}</p>;
  }

  return (
    <div className="space-y-5">
      {grupper.map((gruppe) => {
        const iGruppen = rader.filter((r) => r.gruppe === gruppe);
        if (!iGruppen.length) return null;
        return (
          <section key={gruppe} className="rounded-3xl border border-ink-100 bg-white p-6 shadow-soft sm:p-7">
            <h2 className="text-lg font-semibold">{gruppe}</h2>
            {beskrivelser?.[gruppe] && (
              <p className="mt-1.5 max-w-xl text-sm text-ink-500">{beskrivelser[gruppe]}</p>
            )}
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {iGruppen.map((rad) => (
                <InnstillingFelt key={rad.key} rad={rad} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function InnstillingFelt({ rad }: { rad: Setting }) {
  const { supabase } = useAdmin();
  const [verdi, setVerdi] = useState(rad.value);
  const [status, setStatus] = useState<'' | 'lagrer' | 'lagret' | 'feil'>('');
  const [fraAndre, setFraAndre] = useState(false);
  const timerRef = useRef<number | null>(null);
  const skriverRef = useRef(false);

  // Endret noen andre denne teksten, oppdater feltet – med mindre du skriver i det nå
  useEffect(() => {
    if (skriverRef.current) return;
    if (rad.value === verdi) return;
    setVerdi(rad.value);
    setFraAndre(true);
    const t = window.setTimeout(() => setFraAndre(false), 2600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rad.value]);

  const lagre = useCallback(
    async (ny: string) => {
      if (!supabase) return;
      setStatus('lagrer');
      const { error } = await supabase
        .from('settings')
        .update({ value: ny, updated_at: new Date().toISOString() })
        .eq('key', rad.key);
      if (error) {
        setStatus('feil');
        return;
      }
      skriverRef.current = false;
      setStatus('lagret');
      window.setTimeout(() => setStatus(''), 1600);
    },
    [supabase, rad.key]
  );

  function endre(ny: unknown, straks = false) {
    const tekst = typeof ny === 'boolean' ? (ny ? 'ja' : 'nei') : String(ny ?? '');
    skriverRef.current = true;
    setVerdi(tekst);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (straks) {
      lagre(tekst);
      return;
    }
    setStatus('lagrer');
    timerRef.current = window.setTimeout(() => lagre(tekst), 650);
  }

  const felt: Felt = {
    key: rad.key,
    label: rad.label || rad.key,
    type: (rad.type as Felt['type']) ?? 'text',
    help: rad.help ?? undefined,
  };

  const bred = felt.type === 'longtext';

  return (
    <div className={bred ? 'sm:col-span-2' : ''}>
      <div className="relative">
        <FeltRedigerer felt={felt} verdi={verdi} onEndre={endre} />
        <span className="absolute right-0 top-0 flex items-center gap-1.5">
          {fraAndre && (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
              Endret av en annen
            </span>
          )}
          <StatusMerke status={status} />
        </span>
      </div>
    </div>
  );
}
