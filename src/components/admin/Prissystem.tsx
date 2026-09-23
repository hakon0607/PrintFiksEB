'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin } from './AdminProvider';
import { kr } from '@/lib/settings';
import {
  STANDARD_PRISINNSTILLINGER,
  foreslaPris,
  formelTekst,
  lesPrisinnstillinger,
  tidTekst,
  type Prisinnstillinger,
} from '@/lib/prissetting';
import type { Product } from '@/lib/types';

/* ------------------------------------------------------------------ */
/*  Innstillingene: hva plast og printer koster oss                    */
/* ------------------------------------------------------------------ */

const NOKLER = [
  {
    key: 'pris_filament_gram',
    label: 'Filament koster oss',
    suffix: 'kr per gram',
    hjelp: 'Del prisen på en rull med antall gram. En rull på 1 kg til 300 kr blir 0,30.',
  },
  {
    key: 'pris_printer_time',
    label: 'Printeren koster',
    suffix: 'kr per time',
    hjelp: 'Strøm og slitasje mens printeren går.',
  },
  {
    key: 'pris_profittfaktor',
    label: 'Profittfaktor',
    suffix: 'ganger kostnaden',
    hjelp: 'Kostnaden ganges med dette. 2,8 er et vanlig utgangspunkt.',
  },
];

export function usePrisinnstillinger() {
  const { supabase } = useAdmin();
  const [verdier, setVerdier] = useState<Record<string, string>>({});
  const [lastet, setLastet] = useState(false);

  const hent = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('settings')
      .select('key,value')
      .in('key', NOKLER.map((n) => n.key));
    const samlet: Record<string, string> = {};
    for (const rad of (data as { key: string; value: string }[]) ?? []) {
      samlet[rad.key] = rad.value;
    }
    setVerdier(samlet);
    setLastet(true);
  }, [supabase]);

  useEffect(() => {
    hent();
  }, [hent]);

  const innstillinger = useMemo(() => lesPrisinnstillinger(verdier), [verdier]);

  return { innstillinger, verdier, setVerdier, lastet, hentPaNytt: hent };
}

export function Prisinnstillinger({
  verdier,
  setVerdier,
  innstillinger,
}: {
  verdier: Record<string, string>;
  setVerdier: (v: Record<string, string>) => void;
  innstillinger: Prisinnstillinger;
}) {
  const { supabase } = useAdmin();
  const [status, setStatus] = useState<'' | 'lagrer' | 'lagret'>('');

  async function lagre(key: string, value: string) {
    setVerdier({ ...verdier, [key]: value });
    if (!supabase) return;
    setStatus('lagrer');
    await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
    setStatus('lagret');
    window.setTimeout(() => setStatus(''), 1500);
  }

  return (
    <section className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">Hva koster det oss å printe?</h2>
          <p className="mt-1 text-sm text-ink-600">
            Disse tre tallene brukes til å regne ut anbefalt pris på modellene.
          </p>
        </div>
        {status === 'lagrer' && <span className="text-xs font-semibold text-ink-400">Lagrer …</span>}
        {status === 'lagret' && (
          <span className="text-xs font-semibold text-emerald-600">Lagret ✓</span>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {NOKLER.map((n) => (
          <label key={n.key} className="block">
            <span className="label">{n.label}</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min={0}
                value={
                  verdier[n.key] ??
                  String(
                    n.key === 'pris_filament_gram'
                      ? STANDARD_PRISINNSTILLINGER.filamentPerGram
                      : n.key === 'pris_printer_time'
                        ? STANDARD_PRISINNSTILLINGER.printerPerTime
                        : STANDARD_PRISINNSTILLINGER.profittfaktor
                  )
                }
                onChange={(e) => lagre(n.key, e.target.value)}
                className="field w-28"
              />
              <span className="text-sm text-ink-500">{n.suffix}</span>
            </div>
            <p className="hint">{n.hjelp}</p>
          </label>
        ))}
      </div>

      <p className="mt-4 rounded-2xl bg-ink-50 px-4 py-3 font-mono text-[13px] text-ink-700">
        {formelTekst(innstillinger)}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Panelet inne på hver modell                                        */
/* ------------------------------------------------------------------ */

export function Prispanel({
  rad,
  innstillinger,
}: {
  rad: Record<string, unknown>;
  innstillinger: Prisinnstillinger;
}) {
  const { supabase } = useAdmin();
  const [jobber, setJobber] = useState(false);
  const [melding, setMelding] = useState('');

  const forslag = foreslaPris(rad.weight_g, rad.print_minutes, innstillinger);
  const pris = Number(rad.price ?? 0);
  const automatisk = String(rad.price_mode ?? 'manual') === 'automatic';
  const lagretBeregnet = Number(rad.calculated_price ?? 0);
  const lagretForslag = Number(rad.suggested_price ?? 0);

  async function beregn() {
    if (!supabase || !forslag.kanBeregne) return;
    setJobber(true);
    const patch = {
      calculated_price: forslag.beregnet,
      suggested_price: forslag.foreslatt,
      price: forslag.foreslatt,
      cost_price: forslag.kostnad,
      price_mode: 'automatic',
    };
    const { error } = await supabase.from('products').update(patch).eq('id', String(rad.id));
    setJobber(false);
    setMelding(error ? 'Klarte ikke å lagre prisen.' : 'Prisen er satt ✓');
    window.setTimeout(() => setMelding(''), 2500);
  }

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">
          Pris og fortjeneste
        </p>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
            automatisk ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          {automatisk ? 'Automatisk pris' : 'Manuell pris'}
        </span>
      </div>

      {!forslag.kanBeregne ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[13px] font-semibold text-amber-800">
          {forslag.mangler === 'vekt'
            ? 'Kan ikke beregne pris – legg inn hvor mange gram modellen er.'
            : 'Kan ikke beregne pris – legg inn hvor lang tid printen tar.'}
        </p>
      ) : (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-ink-50 px-3.5 py-3">
              <p className="text-xs font-semibold text-ink-500">Beregnet</p>
              <p className="mt-0.5 text-lg font-bold text-ink-900">
                {forslag.beregnet.toLocaleString('nb-NO', { minimumFractionDigits: 2 })} kr
              </p>
            </div>
            <div className="rounded-xl bg-ink-50 px-3.5 py-3">
              <p className="text-xs font-semibold text-ink-500">Foreslått</p>
              <p className="mt-0.5 text-lg font-bold text-ink-900">{kr(forslag.foreslatt)}</p>
            </div>
            <div className="rounded-xl bg-brand-50 px-3.5 py-3">
              <p className="text-xs font-semibold text-brand-700">Utsalgspris</p>
              <p className="mt-0.5 text-lg font-bold text-brand-800">{kr(pris)}</p>
            </div>
            <div
              className={`rounded-xl px-3.5 py-3 ${
                pris - forslag.kostnad >= 0 ? 'bg-emerald-50' : 'bg-red-50'
              }`}
            >
              <p
                className={`text-xs font-semibold ${
                  pris - forslag.kostnad >= 0 ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                Vi tjener
              </p>
              <p
                className={`mt-0.5 text-lg font-bold ${
                  pris - forslag.kostnad >= 0 ? 'text-emerald-800' : 'text-red-700'
                }`}
              >
                {kr(pris - forslag.kostnad)}
              </p>
            </div>
          </div>

          <p className="mt-3 text-[13px] leading-relaxed text-ink-600">
            {Number(rad.weight_g ?? 0)} g × {innstillinger.filamentPerGram.toLocaleString('nb-NO')} kr
            + {tidTekst(rad.print_minutes)} × {innstillinger.printerPerTime.toLocaleString('nb-NO')}{' '}
            kr = {kr(forslag.kostnad)} i kostnad, ganget med{' '}
            {innstillinger.profittfaktor.toLocaleString('nb-NO')}.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={beregn} disabled={jobber} className="btn-primary btn-sm">
              {jobber ? 'Regner …' : automatisk ? 'Beregn prisen på nytt' : 'Beregn pris'}
            </button>
            {pris !== forslag.foreslatt && (
              <span className="text-xs text-ink-500">
                Utsalgsprisen er {kr(pris)} – forslaget er {kr(forslag.foreslatt)}.
              </span>
            )}
            {melding && <span className="text-xs font-semibold text-emerald-600">{melding}</span>}
          </div>

          {(lagretBeregnet > 0 || lagretForslag > 0) && (
            <p className="mt-2 text-xs text-ink-400">
              Sist beregnet: {lagretBeregnet.toLocaleString('nb-NO', { minimumFractionDigits: 2 })}{' '}
              kr, foreslått {kr(lagretForslag)}.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Oversikt over alle prisene + oppdater alle                          */
/* ------------------------------------------------------------------ */

export function Prisoversikt({ innstillinger }: { innstillinger: Prisinnstillinger }) {
  const { supabase } = useAdmin();
  const [produkter, setProdukter] = useState<Product[]>([]);
  const [apen, setApen] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [valg, setValg] = useState<'auto' | 'alle'>('auto');
  const [jobber, setJobber] = useState(false);
  const [melding, setMelding] = useState('');

  const hent = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from('products').select('*').order('sort');
    setProdukter((data as Product[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    hent();
  }, [hent]);

  const rader = useMemo(
    () =>
      produkter.map((p) => ({
        p,
        f: foreslaPris(p.weight_g, p.print_minutes, innstillinger),
        manuell: String(p.price_mode ?? 'manual') !== 'automatic',
      })),
    [produkter, innstillinger]
  );

  const antallManuelle = rader.filter((r) => r.manuell).length;
  const kanBeregnes = rader.filter((r) => r.f.kanBeregne);
  const utenTid = rader.filter((r) => !r.f.kanBeregne);

  async function oppdaterAlle() {
    if (!supabase) return;
    setJobber(true);
    const skalOppdateres = kanBeregnes.filter((r) => (valg === 'alle' ? true : !r.manuell));

    for (const r of skalOppdateres) {
      await supabase
        .from('products')
        .update({
          calculated_price: r.f.beregnet,
          suggested_price: r.f.foreslatt,
          price: r.f.foreslatt,
          cost_price: r.f.kostnad,
          price_mode: 'automatic',
        })
        .eq('id', r.p.id);
    }

    await hent();
    setJobber(false);
    setDialog(false);
    setMelding(
      `${skalOppdateres.length} modell${skalOppdateres.length === 1 ? '' : 'er'} fikk ny pris.`
    );
    window.setTimeout(() => setMelding(''), 4000);
  }

  return (
    <section className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Prisoversikt</h2>
          <p className="mt-1 text-sm text-ink-600">
            {produkter.length} modeller · {antallManuelle} med manuell pris
            {utenTid.length > 0 ? ` · ${utenTid.length} mangler vekt eller printtid` : ''}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setApen(!apen)}
            className="btn btn-sm border border-ink-200 bg-white text-ink-700"
          >
            {apen ? 'Skjul tabellen' : 'Vis tabellen'}
          </button>
          <button type="button" onClick={() => setDialog(true)} className="btn-primary btn-sm">
            Oppdater alle priser
          </button>
        </div>
      </div>

      {melding && (
        <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800">
          {melding}
        </p>
      )}

      {apen && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs font-bold uppercase tracking-wide text-ink-400">
                <th className="py-2">Modell</th>
                <th className="py-2 text-right">Vekt</th>
                <th className="py-2 text-right">Printtid</th>
                <th className="py-2 text-right">Beregnet</th>
                <th className="py-2 text-right">Utsalgspris</th>
                <th className="py-2 text-right">Type</th>
              </tr>
            </thead>
            <tbody>
              {rader.map(({ p, f, manuell }) => (
                <tr key={p.id} className="border-b border-ink-50">
                  <td className="py-2.5 pr-3 font-semibold text-ink-900">{p.name}</td>
                  <td className="py-2.5 text-right text-ink-600">
                    {p.weight_g ? `${p.weight_g} g` : '–'}
                  </td>
                  <td className="py-2.5 text-right text-ink-600">{tidTekst(p.print_minutes)}</td>
                  <td className="py-2.5 text-right text-ink-600">
                    {f.kanBeregne
                      ? `${f.beregnet.toLocaleString('nb-NO', { minimumFractionDigits: 2 })} kr`
                      : '–'}
                  </td>
                  <td className="py-2.5 text-right font-bold text-ink-900">
                    {kr(Number(p.price ?? 0))}
                  </td>
                  <td className="py-2.5 text-right">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        manuell ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {manuell ? 'Manuell' : 'Automatisk'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bekreftelse */}
      {dialog && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lift">
            <h3 className="text-lg font-bold">Oppdater alle priser?</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Dette regner ut nye priser ut fra vekt, printtid og dagens prisinnstillinger.{' '}
              {kanBeregnes.length} modell{kanBeregnes.length === 1 ? '' : 'er'} kan beregnes.
              {utenTid.length > 0 &&
                ` ${utenTid.length} hoppes over fordi vekt eller printtid mangler.`}
            </p>

            {antallManuelle > 0 && (
              <div className="mt-4 rounded-2xl bg-ink-50 p-4">
                <p className="text-sm font-semibold text-ink-800">
                  Dere har {antallManuelle} modell{antallManuelle === 1 ? '' : 'er'} med manuell
                  pris.
                </p>
                <div className="mt-2 space-y-2">
                  <label className="flex items-start gap-2.5 text-sm text-ink-700">
                    <input
                      type="radio"
                      checked={valg === 'auto'}
                      onChange={() => setValg('auto')}
                      className="mt-0.5"
                    />
                    Oppdater kun modeller med automatisk pris
                  </label>
                  <label className="flex items-start gap-2.5 text-sm text-ink-700">
                    <input
                      type="radio"
                      checked={valg === 'alle'}
                      onChange={() => setValg('alle')}
                      className="mt-0.5"
                    />
                    Oppdater alle, også de med manuell pris
                  </label>
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDialog(false)}
                className="btn btn-sm border border-ink-200 bg-white"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={oppdaterAlle}
                disabled={jobber}
                className="btn-primary btn-sm"
              >
                {jobber ? 'Oppdaterer …' : 'Oppdater priser'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
