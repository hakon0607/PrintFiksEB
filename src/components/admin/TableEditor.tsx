'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAdmin } from './AdminProvider';
import { ImageUpload } from './ImageUpload';
import { ImageListUpload } from './ImageListUpload';
import { BildeSett } from './BildeSett';
import { Fremdrift } from './Fremdrift';
import { lyttPaTabell } from '@/lib/realtime';

export type Felt = {
  key: string;
  label: string;
  type:
    | 'text'
    | 'longtext'
    | 'number'
    | 'price'
    | 'bool'
    | 'image'
    | 'images'
    | 'bildesett'
    | 'color'
    | 'select'
    | 'lines'
    | 'tid';
  valg?: { verdi: string; tekst: string }[];
  placeholder?: string;
  help?: string;
  suffix?: string;
  bred?: boolean;
  readOnly?: boolean;
};

type Rad = Record<string, unknown> & { id: string };

type Props = {
  table: string;
  tittel: string;
  beskrivelse?: string;
  felter: Felt[];
  nyRad: Record<string, unknown>;
  tittelFelt: string;
  enhetsnavn: string;
  harSortering?: boolean;
  harAktiv?: boolean;
  tomTekst?: string;
  finpuss?: boolean;
  /** Liten linje under navnet i listen, f.eks. margin. */
  radInfo?: (rad: Record<string, unknown>) => ReactNode;
  /** Boks øverst når raden er åpen, f.eks. regnestykket for margin. */
  radPanel?: (rad: Record<string, unknown>) => ReactNode;
  /** Kjøres når et felt endres. Returnerer ekstra felter som skal lagres samtidig. */
  folgeEndring?: (
    key: string,
    verdi: unknown,
    rad: Record<string, unknown>
  ) => Record<string, unknown> | null;
};

export function TableEditor({
  table,
  tittel,
  beskrivelse,
  felter,
  nyRad,
  tittelFelt,
  enhetsnavn,
  harSortering = true,
  harAktiv = true,
  tomTekst,
  finpuss = false,
  radInfo,
  radPanel,
  folgeEndring,
}: Props) {
  const { supabase, profile, user } = useAdmin();
  const [rader, setRader] = useState<Rad[]>([]);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState('');
  const [apen, setApen] = useState<string | null>(null);
  const [andreRedigerer, setAndreRedigerer] = useState<Record<string, string>>({});
  const travle = useRef<Set<string>>(new Set());
  const kanalRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);

  const mittNavn = useMemo(
    () => profile?.name || user?.email?.split('@')[0] || 'Noen',
    [profile, user]
  );

  const hent = useCallback(async () => {
    if (!supabase) return;
    setLaster(true);
    let q = supabase.from(table).select('*');
    q = harSortering ? q.order('sort') : q.order('created_at', { ascending: true });
    const { data, error } = await q;
    if (error) setFeil('Klarte ikke å hente data. Last siden på nytt.');
    else setRader((data as Rad[]) ?? []);
    setLaster(false);
  }, [supabase, table, harSortering]);

  useEffect(() => {
    hent();
  }, [hent]);

  // Endringer fra de andre dukker opp med en gang
  useEffect(() => {
    if (!supabase) return;
    return lyttPaTabell(supabase, table, ({ type, ny, gammel }) => {
      const id = String((ny?.id ?? gammel?.id) ?? '');
      if (!id) return;

      if (type === 'DELETE') {
        setRader((prev) => prev.filter((r) => r.id !== id));
        return;
      }
      if (travle.current.has(id)) return; // noen her holder på å skrive i denne

      setRader((prev) => {
        const finnes = prev.some((r) => r.id === id);
        if (!finnes) return [...prev, ny as Rad];
        return prev.map((r) => (r.id === id ? { ...r, ...(ny as Rad) } : r));
      });
    });
  }, [supabase, table]);

  // «Ola redigerer denne» mens noen andre står i et felt
  useEffect(() => {
    if (!supabase) return;
    const kanal = supabase.channel(`redigering:${table}`);
    kanalRef.current = kanal;

    kanal
      .on('broadcast', { event: 'fokus' }, ({ payload }) => {
        const p = payload as { radId: string; navn: string; bruker: string };
        if (p.bruker === user?.id) return;
        setAndreRedigerer((prev) => ({ ...prev, [p.radId]: p.navn }));
        window.setTimeout(() => {
          setAndreRedigerer((prev) => {
            const kopi = { ...prev };
            if (kopi[p.radId] === p.navn) delete kopi[p.radId];
            return kopi;
          });
        }, 15000);
      })
      .on('broadcast', { event: 'slutt' }, ({ payload }) => {
        const p = payload as { radId: string; bruker: string };
        if (p.bruker === user?.id) return;
        setAndreRedigerer((prev) => {
          const kopi = { ...prev };
          delete kopi[p.radId];
          return kopi;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(kanal);
      kanalRef.current = null;
    };
  }, [supabase, table, user?.id]);

  const meldFokus = useCallback(
    (radId: string, aktiv: boolean) => {
      kanalRef.current?.send({
        type: 'broadcast',
        event: aktiv ? 'fokus' : 'slutt',
        payload: { radId, navn: mittNavn, bruker: user?.id ?? '' },
      });
    },
    [mittNavn, user?.id]
  );

  const settTravel = useCallback((radId: string, travel: boolean) => {
    if (travel) travle.current.add(radId);
    else travle.current.delete(radId);
  }, []);

  async function leggTil() {
    if (!supabase) return;
    const maxSort = rader.reduce((m, r) => Math.max(m, Number(r.sort ?? 0)), 0);
    const { data, error } = await supabase
      .from(table)
      .insert({ ...nyRad, ...(harSortering ? { sort: maxSort + 10 } : {}) })
      .select()
      .single();
    if (error || !data) {
      setFeil('Klarte ikke å legge til. Prøv igjen.');
      return;
    }
    setRader((prev) => [...prev, data as Rad]);
    setApen((data as Rad).id);
  }

  async function slett(id: string) {
    if (!supabase) return;
    if (!window.confirm(`Er du sikker på at du vil slette dette ${enhetsnavn}et? Det kan ikke angres.`))
      return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      setFeil('Klarte ikke å slette.');
      return;
    }
    setRader((prev) => prev.filter((r) => r.id !== id));
  }

  async function flytt(id: string, retning: -1 | 1) {
    if (!supabase) return;
    const idx = rader.findIndex((r) => r.id === id);
    const nyIdx = idx + retning;
    if (idx < 0 || nyIdx < 0 || nyIdx >= rader.length) return;

    const kopi = [...rader];
    [kopi[idx], kopi[nyIdx]] = [kopi[nyIdx], kopi[idx]];
    const medSort = kopi.map((r, i) => ({ ...r, sort: (i + 1) * 10 }));
    setRader(medSort);

    await Promise.all(
      medSort.map((r) => supabase.from(table).update({ sort: r.sort }).eq('id', r.id))
    );
  }

  function oppdaterLokalt(id: string, patch: Record<string, unknown>) {
    setRader((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <section className="rounded-3xl border border-ink-100 bg-white p-6 shadow-soft sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{tittel}</h2>
          {beskrivelse && <p className="mt-1.5 max-w-xl text-sm text-ink-500">{beskrivelse}</p>}
        </div>
        <button type="button" onClick={leggTil} className="btn-primary btn-sm">
          + Legg til {enhetsnavn}
        </button>
      </div>

      {feil && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{feil}</p>
      )}

      {laster ? (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-ink-50" />
          ))}
        </div>
      ) : rader.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-ink-200 px-5 py-10 text-center text-sm text-ink-500">
          {tomTekst ?? `Ingen ${enhetsnavn}er ennå. Trykk «Legg til ${enhetsnavn}» for å starte.`}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          <AnimatePresence initial={false}>
            {rader.map((rad, i) => (
              <motion.li
                key={rad.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden rounded-2xl border border-ink-100 bg-white"
              >
                <RadRedigerer
                  table={table}
                  rad={rad}
                  felter={felter}
                  tittelFelt={tittelFelt}
                  harAktiv={harAktiv}
                  harSortering={harSortering}
                  apen={apen === rad.id}
                  forste={i === 0}
                  siste={i === rader.length - 1}
                  onToggle={() => setApen(apen === rad.id ? null : rad.id)}
                  onSlett={() => slett(rad.id)}
                  onFlytt={(r) => flytt(rad.id, r)}
                  onLokal={(patch) => oppdaterLokalt(rad.id, patch)}
                  redigeresAv={andreRedigerer[rad.id]}
                  onFokus={(aktiv) => meldFokus(rad.id, aktiv)}
                  onTravel={(travel) => settTravel(rad.id, travel)}
                  finpuss={finpuss}
                  radInfo={radInfo}
                  radPanel={radPanel}
                  folgeEndring={folgeEndring}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

function RadRedigerer({
  table,
  rad,
  felter,
  tittelFelt,
  harAktiv,
  harSortering,
  apen,
  forste,
  siste,
  onToggle,
  onSlett,
  onFlytt,
  onLokal,
  redigeresAv,
  onFokus,
  onTravel,
  finpuss,
  radInfo,
  radPanel,
  folgeEndring,
}: {
  table: string;
  rad: Rad;
  felter: Felt[];
  tittelFelt: string;
  harAktiv: boolean;
  harSortering: boolean;
  apen: boolean;
  forste: boolean;
  siste: boolean;
  onToggle: () => void;
  onSlett: () => void;
  onFlytt: (retning: -1 | 1) => void;
  onLokal: (patch: Record<string, unknown>) => void;
  redigeresAv?: string;
  onFokus: (aktiv: boolean) => void;
  onTravel: (travel: boolean) => void;
  finpuss?: boolean;
  radInfo?: (rad: Record<string, unknown>) => ReactNode;
  radPanel?: (rad: Record<string, unknown>) => ReactNode;
  folgeEndring?: (
    key: string,
    verdi: unknown,
    rad: Record<string, unknown>
  ) => Record<string, unknown> | null;
}) {
  const { supabase } = useAdmin();
  const [finpusser, setFinpusser] = useState(false);
  const [finpussFerdig, setFinpussFerdig] = useState(false);
  const [foer, setFoer] = useState<Record<string, unknown> | null>(null);
  const [finpussFeil, setFinpussFeil] = useState('');
  const [status, setStatus] = useState<'' | 'lagrer' | 'lagret' | 'feil'>('');
  const timerRef = useRef<number | null>(null);

  const lagre = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!supabase) return;
      setStatus('lagrer');
      const { error } = await supabase.from(table).update(patch).eq('id', rad.id);
      onTravel(false);
      if (error) {
        setStatus('feil');
        return;
      }
      setStatus('lagret');
      window.setTimeout(() => setStatus(''), 1600);
    },
    [supabase, table, rad.id, onTravel]
  );

  function endre(key: string, verdi: unknown, straks = false) {
    const ekstra = folgeEndring?.(key, verdi, rad) ?? null;
    const patch = ekstra ? { [key]: verdi, ...ekstra } : { [key]: verdi };
    onLokal(patch);
    onTravel(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (straks) {
      lagre(patch);
      return;
    }
    setStatus('lagrer');
    timerRef.current = window.setTimeout(() => lagre(patch), 650);
  }

  async function finpussNa() {
    if (!supabase) return;
    setFinpusser(true);
    setFinpussFerdig(false);
    setFinpussFeil('');

    const { data } = await supabase.auth.getSession();
    const res = await fetch('/api/finpuss', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session?.access_token ?? ''}`,
      },
      body: JSON.stringify({
        felter: {
          navn: rad.name ?? '',
          undertittel: rad.tagline ?? '',
          kort: rad.description ?? '',
          full: rad.details ?? '',
          punkter: Array.isArray(rad.highlights) ? rad.highlights : [],
          kategori: rad.category ?? '',
          vekt: rad.weight_g ?? null,
          materiale: rad.material ?? '',
        },
      }),
    });

    const svar = await res.json().catch(() => ({}));
    if (!res.ok || !svar?.forslag) {
      setFinpusser(false);
      setFinpussFeil(svar.error || 'Klarte ikke å finpusse akkurat nå.');
      return;
    }

    const f = svar.forslag as Record<string, unknown>;
    const patch: Record<string, unknown> = {
      name: f.navn,
      tagline: f.undertittel,
      description: f.kort,
      details: f.full,
      highlights: f.punkter,
      category: f.kategori,
      weight_g: f.vekt,
      price: f.pris,
    };

    setFoer({
      name: rad.name ?? '',
      tagline: rad.tagline ?? '',
      description: rad.description ?? '',
      details: rad.details ?? '',
      highlights: Array.isArray(rad.highlights) ? rad.highlights : [],
      category: rad.category ?? '',
      weight_g: rad.weight_g ?? null,
      price: rad.price ?? 0,
    });

    onLokal(patch);
    await lagre(patch);
    setFinpussFerdig(true);
    setFinpusser(false);
    window.setTimeout(() => setFinpussFerdig(false), 1800);
  }

  async function angreFinpuss() {
    if (!foer) return;
    onLokal(foer);
    await lagre(foer);
    setFoer(null);
  }

  const tittel = String(rad[tittelFelt] ?? '') || 'Uten navn';
  const aktiv = harAktiv ? (rad.active as boolean) !== false : true;

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-3">
        {harSortering && (
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => onFlytt(-1)}
              disabled={forste}
              className="text-ink-300 transition-colors hover:text-brand-600 disabled:opacity-30"
              aria-label="Flytt opp"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="m6 15 6-6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onFlytt(1)}
              disabled={siste}
              className="text-ink-300 transition-colors hover:text-brand-600 disabled:opacity-30"
              aria-label="Flytt ned"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
          <span className={`block truncate text-sm font-semibold ${aktiv ? 'text-ink-900' : 'text-ink-400'}`}>
            {tittel}
          </span>
          {!aktiv && <span className="text-xs text-ink-400">Skjult på nettsiden</span>}
          {aktiv && radInfo && <span className="mt-0.5 block text-xs text-ink-500">{radInfo(rad)}</span>}
        </button>

        {redigeresAv && (
          <span className="hidden shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 sm:inline">
            {redigeresAv} redigerer
          </span>
        )}

        <StatusMerke status={status} />

        {harAktiv && (
          <button
            type="button"
            onClick={() => endre('active', !aktiv, true)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              aktiv ? 'bg-brand-600' : 'bg-ink-200'
            }`}
            aria-label={aktiv ? 'Skjul på nettsiden' : 'Vis på nettsiden'}
            title={aktiv ? 'Vises på nettsiden' : 'Skjult på nettsiden'}
          >
            <motion.span
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${
                aktiv ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        )}

        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 rounded-full p-1.5 text-ink-400 transition-colors hover:bg-ink-50"
          aria-label={apen ? 'Lukk' : 'Rediger'}
        >
          <motion.span animate={{ rotate: apen ? 180 : 0 }} className="block">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </motion.span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {apen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-ink-100 bg-ink-50/50"
          >
            {radPanel && <div className="border-b border-ink-100 bg-white px-5 py-4">{radPanel(rad)}</div>}

            {finpuss && (
              <div className="space-y-3 border-b border-ink-100 bg-white px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={finpussNa}
                    disabled={finpusser}
                    className="btn-primary btn-sm"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M12 3.5 13.6 8 18 9.6 13.6 11.2 12 15.7 10.4 11.2 6 9.6 10.4 8zM18.5 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"
                        fill="currentColor"
                      />
                    </svg>
                    {finpusser ? 'Finpusser…' : 'Finpuss med AI'}
                  </button>

                  {foer && !finpusser && (
                    <button type="button" onClick={angreFinpuss} className="btn-ghost btn-sm">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path
                          d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"
                          stroke="currentColor"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Angre finpuss
                    </button>
                  )}

                  <span className="text-xs text-ink-500">
                    AI-en rydder teksten og fyller ut det du ikke har skrevet.
                  </span>
                </div>

                <Fremdrift
                  aktiv={finpusser}
                  ferdig={finpussFerdig}
                  tekst={finpusser ? 'AI-en skriver…' : 'Ferdig'}
                />

                {finpussFeil && (
                  <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
                    {finpussFeil}
                  </p>
                )}
              </div>
            )}

            <div
              className="grid gap-4 p-5 sm:grid-cols-2"
              onFocusCapture={() => onFokus(true)}
              onBlurCapture={() => onFokus(false)}
            >
              {felter.map((felt) => (
                <div
                  key={felt.key}
                  className={
                    felt.bred ||
                    felt.type === 'longtext' ||
                    felt.type === 'image' ||
                    felt.type === 'images' ||
                    felt.type === 'bildesett' ||
                    felt.type === 'lines'
                      ? 'sm:col-span-2'
                      : ''
                  }
                >
                  <FeltRedigerer
                    felt={felt}
                    verdi={rad[felt.key]}
                    rad={rad}
                    onEndre={(v, straks) => endre(felt.key, v, straks)}
                    onPatch={(patch) => {
                      onLokal(patch);
                      lagre(patch);
                    }}
                  />
                </div>
              ))}

              <div className="sm:col-span-2 flex justify-end border-t border-ink-100 pt-4">
                <button
                  type="button"
                  onClick={onSlett}
                  className="btn btn-sm border border-red-200 bg-white text-red-600 hover:bg-red-50"
                >
                  Slett
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FeltRedigerer({
  felt,
  verdi,
  rad,
  onEndre,
  onPatch,
}: {
  felt: Felt;
  verdi: unknown;
  rad?: Record<string, unknown>;
  onEndre: (verdi: unknown, straks?: boolean) => void;
  onPatch?: (patch: Record<string, unknown>) => void;
}) {
  const id = `${felt.key}-${Math.random().toString(36).slice(2, 7)}`;

  if (felt.type === 'image') {
    return (
      <ImageUpload
        label={felt.label}
        help={felt.help}
        value={String(verdi ?? '')}
        onChange={(url) => onEndre(url, true)}
      />
    );
  }

  if (felt.type === 'bildesett') {
    return (
      <BildeSett
        label={felt.label}
        hoved={String(rad?.image_url ?? '')}
        andre={(Array.isArray(rad?.images) ? rad?.images : []) as string[]}
        onChange={(hoved, andre) => onPatch?.({ image_url: hoved, images: andre })}
      />
    );
  }

  if (felt.type === 'images') {
    return (
      <ImageListUpload
        label={felt.label}
        help={felt.help}
        value={(Array.isArray(verdi) ? verdi : []) as string[]}
        onChange={(urls) => onEndre(urls, true)}
      />
    );
  }

  if (felt.type === 'lines') {
    const linjer = Array.isArray(verdi) ? (verdi as string[]) : [];
    return (
      <div>
        <label className="label" htmlFor={id}>
          {felt.label}
        </label>
        <textarea
          id={id}
          rows={4}
          defaultValue={linjer.join('\n')}
          placeholder={felt.placeholder}
          onBlur={(e) =>
            onEndre(
              e.target.value
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean),
              true
            )
          }
          className="field resize-y"
        />
        <p className="hint">{felt.help ?? 'Ett punkt per linje.'}</p>
      </div>
    );
  }

  if (felt.type === 'tid') {
    const totalt = Math.max(0, Math.round(Number(verdi) || 0));
    const timer = Math.floor(totalt / 60);
    const minutter = totalt % 60;
    return (
      <div>
        <span className="label">{felt.label}</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              value={timer}
              onChange={(e) =>
                onEndre(Math.max(0, Math.round(Number(e.target.value) || 0)) * 60 + minutter)
              }
              className="field w-20"
              aria-label="Timer"
            />
            <span className="text-sm font-semibold text-ink-500">t</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={59}
              value={minutter}
              onChange={(e) => {
                const m = Math.min(59, Math.max(0, Math.round(Number(e.target.value) || 0)));
                onEndre(timer * 60 + m);
              }}
              className="field w-20"
              aria-label="Minutter"
            />
            <span className="text-sm font-semibold text-ink-500">min</span>
          </div>
        </div>
        {felt.help && <p className="hint">{felt.help}</p>}
      </div>
    );
  }

  if (felt.type === 'bool') {
    const på = verdi === true || verdi === 'ja' || verdi === 'true';
    return (
      <div>
        <span className="label">{felt.label}</span>
        <button
          type="button"
          onClick={() => onEndre(typeof verdi === 'boolean' ? !på : på ? 'nei' : 'ja', true)}
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
            på ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-ink-200 bg-white text-ink-500'
          }`}
        >
          <span className={`relative h-6 w-11 rounded-full transition-colors ${på ? 'bg-brand-600' : 'bg-ink-200'}`}>
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                på ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </span>
          {på ? 'På' : 'Av'}
        </button>
        {felt.help && <p className="hint">{felt.help}</p>}
      </div>
    );
  }

  if (felt.type === 'select') {
    return (
      <div>
        <span className="label">{felt.label}</span>
        <div className="flex flex-wrap gap-2">
          {(felt.valg ?? []).map((v) => {
            const valgt = String(verdi ?? '') === v.verdi;
            return (
              <button
                key={v.verdi}
                type="button"
                onClick={() => onEndre(v.verdi, true)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                  valgt
                    ? 'border-brand-500 bg-brand-50 text-brand-700 ring-4 ring-brand-100'
                    : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300'
                }`}
              >
                {v.tekst}
              </button>
            );
          })}
        </div>
        {felt.help && <p className="hint">{felt.help}</p>}
      </div>
    );
  }

  if (felt.type === 'longtext') {
    return (
      <div>
        <label className="label" htmlFor={id}>
          {felt.label}
        </label>
        <textarea
          id={id}
          rows={4}
          value={String(verdi ?? '')}
          placeholder={felt.placeholder}
          onChange={(e) => onEndre(e.target.value)}
          className="field resize-y"
        />
        {felt.help && <p className="hint">{felt.help}</p>}
      </div>
    );
  }

  if (felt.type === 'color') {
    return (
      <div>
        <label className="label" htmlFor={id}>
          {felt.label}
        </label>
        <div className="flex items-center gap-3">
          <input
            id={id}
            type="color"
            value={String(verdi ?? '#2559C7')}
            onChange={(e) => onEndre(e.target.value)}
            className="h-11 w-14 cursor-pointer rounded-xl border border-ink-200 bg-white p-1"
          />
          <input
            value={String(verdi ?? '')}
            onChange={(e) => onEndre(e.target.value)}
            className="field flex-1"
          />
        </div>
        {felt.help && <p className="hint">{felt.help}</p>}
      </div>
    );
  }

  const erTall = felt.type === 'number' || felt.type === 'price';

  return (
    <div>
      <label className="label" htmlFor={id}>
        {felt.label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={erTall ? 'number' : 'text'}
          step={felt.type === 'price' ? '0.01' : '1'}
          value={verdi === null || verdi === undefined ? '' : String(verdi)}
          placeholder={felt.placeholder}
          readOnly={felt.readOnly}
          onChange={(e) =>
            onEndre(erTall ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)
          }
          className={`field ${felt.suffix ? 'pr-16' : ''} ${felt.readOnly ? 'bg-ink-50 text-ink-500' : ''}`}
        />
        {felt.suffix && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-400">
            {felt.suffix}
          </span>
        )}
      </div>
      {felt.help && <p className="hint">{felt.help}</p>}
    </div>
  );
}

export function StatusMerke({ status }: { status: '' | 'lagrer' | 'lagret' | 'feil' }) {
  return (
    <AnimatePresence mode="wait">
      {status && (
        <motion.span
          key={status}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
            status === 'lagret'
              ? 'bg-emerald-50 text-emerald-700'
              : status === 'feil'
                ? 'bg-red-50 text-red-700'
                : 'bg-ink-100 text-ink-500'
          }`}
        >
          {status === 'lagrer' ? 'Lagrer…' : status === 'lagret' ? 'Lagret ✓' : 'Feil'}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
