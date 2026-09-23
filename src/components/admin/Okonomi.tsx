'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAdmin } from './AdminProvider';
import { lyttPaTabell } from '@/lib/realtime';
import { kr } from '@/lib/settings';
import type { Finance, Order } from '@/lib/types';

const KATEGORIER = [
  'Filament',
  'Emballasje',
  'Verktøy og utstyr',
  'Reservedeler',
  'Markedsføring',
  'Salg på stand',
  'Kontantsalg',
  'Annet',
];

type Periode = 'mnd' | 'ar' | 'alt';

const PERIODER: { verdi: Periode; tekst: string }[] = [
  { verdi: 'mnd', tekst: 'Denne måneden' },
  { verdi: 'ar', tekst: 'I år' },
  { verdi: 'alt', tekst: 'Alt' },
];

function startDato(periode: Periode): Date | null {
  const na = new Date();
  if (periode === 'mnd') return new Date(na.getFullYear(), na.getMonth(), 1);
  if (periode === 'ar') return new Date(na.getFullYear(), 0, 1);
  return null;
}

/** Godtar "249", "249,50", "1 200", "249 kr", "kr 249,-" og liknende. */
function lesBelop(raw: string): number | null {
  const rent = raw
    .replace(/\u00a0/g, ' ')
    .replace(/kr/gi, '')
    .replace(/[^0-9,.-]/g, '')
    .replace(/\.(?=\d{3}\b)/g, '')
    .replace(',', '.')
    .replace(/-+$/, '')
    .trim();
  if (!rent) return null;
  const n = Number(rent);
  return Number.isFinite(n) ? n : null;
}

function iDag(): string {
  return new Date().toISOString().slice(0, 10);
}

function visDato(iso: string): string {
  return new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function manedNavn(d: Date): string {
  return d.toLocaleDateString('nb-NO', { month: 'short' });
}

export function Okonomi() {
  const { supabase, profile, user } = useAdmin();
  const [poster, setPoster] = useState<Finance[]>([]);
  const [ordrer, setOrdrer] = useState<Order[]>([]);
  const [laster, setLaster] = useState(true);
  const [mangler, setMangler] = useState(false);
  const [feil, setFeil] = useState('');
  const [periode, setPeriode] = useState<Periode>('mnd');
  const [medBestillinger, setMedBestillinger] = useState(true);
  const [apen, setApen] = useState<string | null>(null);

  // Ny føring
  const [type, setType] = useState<'inntekt' | 'utgift'>('utgift');
  const [beskrivelse, setBeskrivelse] = useState('');
  const [kategori, setKategori] = useState('');
  const [belop, setBelop] = useState('');
  const [dato, setDato] = useState(iDag());

  const hent = useCallback(async () => {
    if (!supabase) return;
    setLaster(true);
    const [f, o] = await Promise.all([
      supabase.from('finances').select('*').order('dato', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
    ]);
    if (f.error) {
      setMangler(true);
      setLaster(false);
      return;
    }
    setMangler(false);
    setPoster((f.data as Finance[]) ?? []);
    setOrdrer((o.data as Order[]) ?? []);
    setLaster(false);
  }, [supabase]);

  useEffect(() => {
    hent();
  }, [hent]);

  // Fører noen andre noe inn, ser du det med en gang
  useEffect(() => {
    if (!supabase) return;
    return lyttPaTabell(supabase, 'finances', ({ type: t, ny, gammel }) => {
      const id = String((ny?.id ?? gammel?.id) ?? '');
      if (!id) return;
      if (t === 'DELETE') {
        setPoster((prev) => prev.filter((p) => p.id !== id));
        return;
      }
      setPoster((prev) => {
        const finnes = prev.some((p) => p.id === id);
        const neste = finnes
          ? prev.map((p) => (p.id === id ? { ...p, ...(ny as Finance) } : p))
          : [ny as Finance, ...prev];
        return [...neste].sort((a, b) => (a.dato < b.dato ? 1 : -1));
      });
    });
  }, [supabase]);

  const fra = startDato(periode);

  const iPerioden = useMemo(
    () => poster.filter((p) => !fra || new Date(p.dato + 'T00:00:00') >= fra),
    [poster, fra]
  );

  const betalteOrdrer = useMemo(
    () =>
      ordrer.filter(
        (o) => o.betalt && Number(o.pris ?? 0) > 0 && (!fra || new Date(o.created_at) >= fra)
      ),
    [ordrer, fra]
  );

  const fraBestillinger = useMemo(
    () => (medBestillinger ? betalteOrdrer.reduce((sum, o) => sum + Number(o.pris ?? 0), 0) : 0),
    [betalteOrdrer, medBestillinger]
  );

  const egneInntekter = useMemo(
    () => iPerioden.filter((p) => p.type === 'inntekt').reduce((s, p) => s + Number(p.belop), 0),
    [iPerioden]
  );
  const utgifter = useMemo(
    () => iPerioden.filter((p) => p.type !== 'inntekt').reduce((s, p) => s + Number(p.belop), 0),
    [iPerioden]
  );

  const inntekter = egneInntekter + fraBestillinger;
  const overskudd = inntekter - utgifter;

  // Siste seks måneder, til søylene
  const maneder = useMemo(() => {
    const na = new Date();
    const liste: { navn: string; inn: number; ut: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(na.getFullYear(), na.getMonth() - i, 1);
      const slutt = new Date(na.getFullYear(), na.getMonth() - i + 1, 1);
      const inn =
        poster
          .filter(
            (p) =>
              p.type === 'inntekt' &&
              new Date(p.dato + 'T00:00:00') >= start &&
              new Date(p.dato + 'T00:00:00') < slutt
          )
          .reduce((s, p) => s + Number(p.belop), 0) +
        (medBestillinger
          ? ordrer
              .filter(
                (o) =>
                  o.betalt &&
                  new Date(o.created_at) >= start &&
                  new Date(o.created_at) < slutt
              )
              .reduce((s, o) => s + Number(o.pris ?? 0), 0)
          : 0);
      const ut = poster
        .filter(
          (p) =>
            p.type !== 'inntekt' &&
            new Date(p.dato + 'T00:00:00') >= start &&
            new Date(p.dato + 'T00:00:00') < slutt
        )
        .reduce((s, p) => s + Number(p.belop), 0);
      liste.push({ navn: manedNavn(start), inn, ut });
    }
    return liste;
  }, [poster, ordrer, medBestillinger]);

  const hoyeste = Math.max(1, ...maneder.flatMap((m) => [m.inn, m.ut]));

  async function leggTil(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setFeil('Ingen kontakt med databasen. Last siden på nytt og prøv igjen.');
      return;
    }

    const tekst = beskrivelse.trim() || kategori.trim();
    const sum = lesBelop(belop);

    if (!tekst) {
      setFeil('Skriv kort hva det gjelder, f.eks. «1 kg PLA svart».');
      return;
    }
    if (sum === null || sum <= 0) {
      setFeil('Skriv et beløp større enn 0, f.eks. 249.');
      return;
    }

    setFeil('');
    const ny = {
      dato: dato || iDag(),
      type,
      kategori: kategori.trim(),
      beskrivelse: tekst,
      belop: sum,
      betalt: true,
      opprettet_av: profile?.name || user?.email || '',
    };
    const { data, error } = await supabase.from('finances').insert(ny).select().single();
    if (error || !data) {
      setFeil(
        error?.message
          ? `Klarte ikke å lagre: ${error.message}`
          : 'Klarte ikke å lagre føringen.'
      );
      return;
    }
    setPoster((prev) => [data as Finance, ...prev].sort((a, b) => (a.dato < b.dato ? 1 : -1)));
    setBeskrivelse('');
    setBelop('');
    setKategori('');
  }

  async function endre(id: string, patch: Partial<Finance>) {
    if (!supabase) return;
    setPoster((prev) =>
      [...prev.map((p) => (p.id === id ? { ...p, ...patch } : p))].sort((a, b) =>
        a.dato < b.dato ? 1 : -1
      )
    );
    const { error } = await supabase.from('finances').update(patch).eq('id', id);
    if (error) setFeil('Klarte ikke å lagre endringen.');
  }

  async function slett(id: string) {
    if (!supabase) return;
    if (!window.confirm('Slette denne føringen? Det kan ikke angres.')) return;
    setPoster((prev) => prev.filter((p) => p.id !== id));
    await supabase.from('finances').delete().eq('id', id);
  }

  if (mangler) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        Regnskapet er ikke satt opp i databasen ennå. Kjør{' '}
        <code className="rounded bg-white px-1.5 py-0.5">supabase/okonomi.sql</code> i Supabase, så
        dukker denne siden opp med tall.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Periode */}
      <div className="flex flex-wrap items-center gap-2">
        {PERIODER.map((p) => (
          <button
            key={p.verdi}
            type="button"
            onClick={() => setPeriode(p.verdi)}
            className={`btn btn-sm ${
              periode === p.verdi ? 'btn-dark' : 'border border-ink-200 bg-white text-ink-700'
            }`}
          >
            {p.tekst}
          </button>
        ))}
      </div>

      {/* Nøkkeltall */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
            Penger inn
          </p>
          <p className="mt-1 text-3xl font-bold text-emerald-800">{kr(inntekter)}</p>
          <p className="mt-1 text-xs text-emerald-700">
            {medBestillinger && fraBestillinger > 0
              ? `${kr(fraBestillinger)} fra betalte bestillinger + ${kr(egneInntekter)} ført selv`
              : 'Ført av dere'}
          </p>
        </div>

        <div className="rounded-3xl border border-red-100 bg-red-50 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-red-600">
            Penger ut
          </p>
          <p className="mt-1 text-3xl font-bold text-red-700">{kr(utgifter)}</p>
          <p className="mt-1 text-xs text-red-600">Filament, emballasje, utstyr og annet</p>
        </div>

        <div
          className={`rounded-3xl border p-5 ${
            overskudd >= 0 ? 'border-brand-200 bg-brand-50' : 'border-red-200 bg-white'
          }`}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-700">
            {overskudd >= 0 ? 'Overskudd' : 'Underskudd'}
          </p>
          <p
            className={`mt-1 text-3xl font-bold ${
              overskudd >= 0 ? 'text-brand-800' : 'text-red-700'
            }`}
          >
            {kr(Math.abs(overskudd))}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            {inntekter > 0 ? `${Math.round((overskudd / inntekter) * 100)} % av det vi har solgt for` : 'Ingen inntekt ennå'}
          </p>
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-ink-600">
        <input
          type="checkbox"
          checked={medBestillinger}
          onChange={(e) => setMedBestillinger(e.target.checked)}
          className="h-4 w-4 rounded border-ink-300 text-brand-600"
        />
        Ta med bestillinger som er huket av som betalt ({betalteOrdrer.length} stk,{' '}
        {kr(betalteOrdrer.reduce((s, o) => s + Number(o.pris ?? 0), 0))})
      </label>

      {/* Ny føring */}
      <form onSubmit={leggTil} className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">
          Før inn penger inn eller ut
        </p>

        <div className="mt-3 flex gap-2">
          {(['utgift', 'inntekt'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`btn btn-sm ${
                type === t
                  ? t === 'utgift'
                    ? 'bg-red-600 text-white'
                    : 'bg-emerald-600 text-white'
                  : 'border border-ink-200 bg-white text-ink-700'
              }`}
            >
              {t === 'utgift' ? 'Penger ut' : 'Penger inn'}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <label className="label" htmlFor="okonomi-hva">
              Hva gjelder det?
            </label>
            <input
              id="okonomi-hva"
              value={beskrivelse}
              onChange={(e) => {
                setBeskrivelse(e.target.value);
                if (feil) setFeil('');
              }}
              placeholder={type === 'utgift' ? 'F.eks. 1 kg PLA svart' : 'F.eks. salg på foreldremøte'}
              className="field"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="label" htmlFor="okonomi-kategori">
              Kategori
            </label>
            <input
              id="okonomi-kategori"
              list="okonomi-kategorier"
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              placeholder="Velg eller skriv"
              className="field"
            />
            <datalist id="okonomi-kategorier">
              {KATEGORIER.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="okonomi-belop">
              Beløp
            </label>
            <input
              id="okonomi-belop"
              value={belop}
              onChange={(e) => {
                setBelop(e.target.value);
                if (feil) setFeil('');
              }}
              inputMode="decimal"
              placeholder="0"
              className="field"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="okonomi-dato">
              Dato
            </label>
            <input
              id="okonomi-dato"
              type="date"
              value={dato}
              onChange={(e) => setDato(e.target.value)}
              className="field"
            />
          </div>
        </div>

        {feil && <p className="mt-3 text-sm font-semibold text-red-600">{feil}</p>}

        <div className="mt-3 flex justify-end">
          <button type="submit" className="btn-primary btn-sm">
            Legg til
          </button>
        </div>
      </form>

      {/* Søyler per måned */}
      <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">
          Siste seks måneder
        </p>
        <div className="mt-4 grid grid-cols-6 gap-3">
          {maneder.map((m) => (
            <div key={m.navn} className="flex flex-col items-center gap-2">
              <div className="flex h-28 w-full items-end justify-center gap-1.5">
                <div
                  className="w-1/2 rounded-t-lg bg-emerald-500/85"
                  style={{ height: `${Math.max(2, (m.inn / hoyeste) * 100)}%` }}
                  title={`Inn: ${kr(m.inn)}`}
                />
                <div
                  className="w-1/2 rounded-t-lg bg-red-400/85"
                  style={{ height: `${Math.max(2, (m.ut / hoyeste) * 100)}%` }}
                  title={`Ut: ${kr(m.ut)}`}
                />
              </div>
              <p className="text-[11px] font-semibold capitalize text-ink-500">{m.navn}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-ink-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Inn
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-red-400" /> Ut
          </span>
        </div>
      </div>

      {/* Føringer */}
      <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">
          Føringer {periode === 'alt' ? '' : periode === 'mnd' ? 'denne måneden' : 'i år'}
        </p>

        {laster ? (
          <p className="mt-4 text-sm text-ink-500">Henter …</p>
        ) : iPerioden.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-ink-50 px-4 py-5 text-sm text-ink-500">
            Ingen føringer her ennå. Legg inn det dere har kjøpt av filament og utstyr, så ser dere
            med en gang om dere går i pluss.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            <AnimatePresence initial={false}>
              {iPerioden.map((p) => {
                const inn = p.type === 'inntekt';
                return (
                  <motion.li
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden rounded-2xl border border-ink-100"
                  >
                    <button
                      type="button"
                      onClick={() => setApen(apen === p.id ? null : p.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                          inn ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {inn ? '+' : '−'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink-900">
                          {p.beskrivelse}
                        </span>
                        <span className="text-xs text-ink-500">
                          {visDato(p.dato)}
                          {p.kategori ? ` · ${p.kategori}` : ''}
                          {p.opprettet_av ? ` · ${p.opprettet_av}` : ''}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 text-sm font-bold ${
                          inn ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {inn ? '+' : '−'}
                        {kr(Number(p.belop))}
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {apen === p.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-ink-100 bg-ink-50/50"
                        >
                          <div className="grid gap-3 p-4 sm:grid-cols-12">
                            <div className="sm:col-span-5">
                              <label className="label">Hva gjelder det?</label>
                              <input
                                value={p.beskrivelse}
                                onChange={(e) => endre(p.id, { beskrivelse: e.target.value })}
                                className="field"
                              />
                            </div>
                            <div className="sm:col-span-3">
                              <label className="label">Kategori</label>
                              <input
                                list="okonomi-kategorier"
                                value={p.kategori ?? ''}
                                onChange={(e) => endre(p.id, { kategori: e.target.value })}
                                className="field"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="label">Beløp</label>
                              <input
                                value={String(p.belop)}
                                inputMode="decimal"
                                onChange={(e) => {
                                  const n = lesBelop(e.target.value);
                                  endre(p.id, { belop: n ?? 0 });
                                }}
                                className="field"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="label">Dato</label>
                              <input
                                type="date"
                                value={p.dato}
                                onChange={(e) => endre(p.id, { dato: e.target.value })}
                                className="field"
                              />
                            </div>
                            <div className="sm:col-span-12">
                              <label className="label">Notat</label>
                              <input
                                value={p.notat ?? ''}
                                onChange={(e) => endre(p.id, { notat: e.target.value })}
                                placeholder="Hvor kjøpte vi det, hvem betalte, kvittering ..."
                                className="field"
                              />
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-12">
                              <div className="flex gap-2">
                                {(['utgift', 'inntekt'] as const).map((t) => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => endre(p.id, { type: t })}
                                    className={`btn btn-sm ${
                                      p.type === t
                                        ? t === 'utgift'
                                          ? 'bg-red-600 text-white'
                                          : 'bg-emerald-600 text-white'
                                        : 'border border-ink-200 bg-white text-ink-700'
                                    }`}
                                  >
                                    {t === 'utgift' ? 'Penger ut' : 'Penger inn'}
                                  </button>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => slett(p.id)}
                                className="btn btn-sm border border-red-200 bg-white text-red-600 hover:bg-red-50"
                              >
                                Slett føringen
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {/* Betalte bestillinger */}
      {medBestillinger && betalteOrdrer.length > 0 && (
        <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">
            Betalte bestillinger som er regnet med
          </p>
          <ul className="mt-3 divide-y divide-ink-100">
            {betalteOrdrer.slice(0, 20).map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink-900">
                    {o.kunde || 'Uten navn'}
                  </span>
                  <span className="block truncate text-xs text-ink-500">
                    {visDato(o.created_at.slice(0, 10))} · {o.hva || 'Ingen beskrivelse'}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-bold text-emerald-700">
                  +{kr(Number(o.pris ?? 0))}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-500">
            Disse hentes fra <span className="font-semibold text-ink-700">Bestillinger</span>. Huk av
            «betalt» der, så kommer de hit av seg selv.
          </p>
        </div>
      )}
    </div>
  );
}
