'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAdmin } from './AdminProvider';
import { lyttPaTabell } from '@/lib/realtime';
import type { Order, TeamMember } from '@/lib/types';

const STATUSER = [
  { verdi: 'ny', tekst: 'Ny', farge: 'bg-amber-50 text-amber-700 border-amber-200' },
  { verdi: 'tilbud', tekst: 'Pris sendt', farge: 'bg-sky-50 text-sky-700 border-sky-200' },
  { verdi: 'godkjent', tekst: 'Godkjent', farge: 'bg-brand-50 text-brand-700 border-brand-200' },
  { verdi: 'produksjon', tekst: 'Printes', farge: 'bg-violet-50 text-violet-700 border-violet-200' },
  { verdi: 'ferdig', tekst: 'Ferdig', farge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { verdi: 'levert', tekst: 'Levert', farge: 'bg-ink-100 text-ink-600 border-ink-200' },
  { verdi: 'avlyst', tekst: 'Avlyst', farge: 'bg-red-50 text-red-600 border-red-200' },
];

const AKTIVE = ['ny', 'tilbud', 'godkjent', 'produksjon', 'ferdig'];

function statusInfo(v: string) {
  return STATUSER.find((s) => s.verdi === v) ?? STATUSER[0];
}

function datoTekst(iso: string | null) {
  if (!iso) return null;
  const i_dag = new Date();
  i_dag.setHours(0, 0, 0, 0);
  const d = new Date(iso + 'T00:00:00');
  const dager = Math.round((d.getTime() - i_dag.getTime()) / 86400000);
  if (dager < 0) return { tekst: `${Math.abs(dager)} dag${Math.abs(dager) === 1 ? '' : 'er'} på overtid`, rod: true };
  if (dager === 0) return { tekst: 'Frist i dag', rod: true };
  if (dager === 1) return { tekst: 'Frist i morgen', rod: false };
  return { tekst: `Frist ${d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}`, rod: false };
}

export function Bestillinger() {
  const { supabase, profile, user } = useAdmin();
  const [bestillinger, setBestillinger] = useState<Order[]>([]);
  const [folk, setFolk] = useState<TeamMember[]>([]);
  const [laster, setLaster] = useState(true);
  const [mangler, setMangler] = useState(false);
  const [feil, setFeil] = useState('');
  const [filter, setFilter] = useState('aktive');
  const [sok, setSok] = useState('');
  const [nyApen, setNyApen] = useState(false);
  const [apen, setApen] = useState<string | null>(null);

  const [ny, setNy] = useState({
    kunde: '',
    telefon: '',
    adresse: '',
    hva: '',
    pris: '',
    levering: 'Henting',
    betalingsmate: 'Vipps',
    frist: '',
    ansvarlig: '',
  });

  const hent = useCallback(async () => {
    if (!supabase) return;
    setLaster(true);
    const [b, t] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('team_members').select('*').order('sort'),
    ]);
    if (b.error) {
      setMangler(true);
      setLaster(false);
      return;
    }
    setMangler(false);
    setBestillinger((b.data as Order[]) ?? []);
    setFolk((t.data as TeamMember[]) ?? []);
    setLaster(false);
  }, [supabase]);

  useEffect(() => {
    hent();
  }, [hent]);

  useEffect(() => {
    if (!supabase) return;
    return lyttPaTabell(supabase, 'orders', ({ type, ny: rad, gammel }) => {
      const id = String((rad?.id ?? gammel?.id) ?? '');
      if (!id) return;
      if (type === 'DELETE') {
        setBestillinger((prev) => prev.filter((o) => o.id !== id));
        return;
      }
      setBestillinger((prev) => {
        const finnes = prev.some((o) => o.id === id);
        if (!finnes) return [rad as Order, ...prev];
        return prev.map((o) => (o.id === id ? { ...o, ...(rad as Order) } : o));
      });
    });
  }, [supabase]);

  async function opprett(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !ny.kunde.trim() || !ny.hva.trim()) return;
    const { data, error } = await supabase
      .from('orders')
      .insert({
        kunde: ny.kunde.trim(),
        telefon: ny.telefon.trim(),
        adresse: ny.adresse.trim(),
        hva: ny.hva.trim(),
        pris: Number(ny.pris) || 0,
        levering: ny.levering,
        betalingsmate: ny.betalingsmate,
        frist: ny.frist || null,
        ansvarlig: ny.ansvarlig || null,
        status: 'ny',
        opprettet_av: profile?.name || user?.email || '',
      })
      .select()
      .single();

    if (error || !data) {
      setFeil('Klarte ikke å lagre bestillingen.');
      return;
    }
    setBestillinger((prev) => [data as Order, ...prev.filter((o) => o.id !== (data as Order).id)]);
    setNy({
      kunde: '',
      telefon: '',
      adresse: '',
      hva: '',
      pris: '',
      levering: 'Henting',
      betalingsmate: 'Vipps',
      frist: '',
      ansvarlig: '',
    });
    setNyApen(false);
    setApen((data as Order).id);
  }

  async function endre(id: string, patch: Partial<Order>) {
    if (!supabase) return;
    setBestillinger((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    const { error } = await supabase
      .from('orders')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) setFeil('Klarte ikke å lagre endringen.');
  }

  async function slett(id: string) {
    if (!supabase) return;
    if (!window.confirm('Slette denne bestillingen? Det kan ikke angres.')) return;
    setBestillinger((prev) => prev.filter((o) => o.id !== id));
    await supabase.from('orders').delete().eq('id', id);
  }

  const synlige = useMemo(() => {
    const q = sok.trim().toLowerCase();
    return bestillinger.filter((o) => {
      if (filter === 'aktive' && !AKTIVE.includes(o.status)) return false;
      if (filter !== 'aktive' && filter !== 'alle' && o.status !== filter) return false;
      if (!q) return true;
      return [o.kunde, o.hva, o.telefon, o.adresse, o.notat]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [bestillinger, filter, sok]);

  const tall = useMemo(() => {
    const aktive = bestillinger.filter((o) => AKTIVE.includes(o.status)).length;
    const ubetalt = bestillinger.filter(
      (o) => !o.betalt && ['ferdig', 'levert'].includes(o.status)
    ).length;
    const naa = new Date();
    const tjentDenneMnd = bestillinger
      .filter((o) => {
        if (!o.betalt) return false;
        const d = new Date(o.created_at);
        return d.getMonth() === naa.getMonth() && d.getFullYear() === naa.getFullYear();
      })
      .reduce((sum, o) => sum + (Number(o.pris) || 0), 0);
    return { aktive, ubetalt, tjentDenneMnd };
  }, [bestillinger]);

  if (mangler) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        Bestillingsoversikten er ikke satt opp ennå. Kjør{' '}
        <code className="rounded bg-white px-1.5 py-0.5">supabase/schema.sql</code> på nytt i
        Supabase, så dukker den opp her.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Tall */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { t: tall.aktive, d: 'bestillinger på gang' },
          { t: tall.ubetalt, d: 'venter på betaling' },
          { t: `${Math.round(tall.tjentDenneMnd)} kr`, d: 'betalt inn denne måneden' },
        ].map((n) => (
          <div key={n.d} className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
            <p className="text-2xl font-bold text-ink-900">{n.t}</p>
            <p className="mt-0.5 text-sm text-ink-500">{n.d}</p>
          </div>
        ))}
      </div>

      {/* Ny bestilling */}
      <section className="overflow-hidden rounded-3xl border border-brand-200 bg-white shadow-soft">
        <button
          type="button"
          onClick={() => setNyApen((v) => !v)}
          className="flex w-full items-center gap-3 bg-brand-50/70 px-6 py-4 text-left transition-colors hover:bg-brand-50"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-xl font-bold text-white">
            +
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold text-ink-900">Ny bestilling</span>
            <span className="mt-0.5 block text-sm text-ink-600">
              Fyll inn det kunden vil ha når meldingen kommer inn
            </span>
          </span>
          <motion.span animate={{ rotate: nyApen ? 180 : 0 }} className="shrink-0 text-brand-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {nyApen && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={opprett}
              className="overflow-hidden"
            >
              <div className="grid gap-4 border-t border-brand-100 p-6 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="b-kunde">
                    Hvem har bestilt? <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="b-kunde"
                    value={ny.kunde}
                    onChange={(e) => setNy({ ...ny, kunde: e.target.value })}
                    className="field"
                    placeholder="Navn"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="b-tlf">
                    Telefon
                  </label>
                  <input
                    id="b-tlf"
                    value={ny.telefon}
                    onChange={(e) => setNy({ ...ny, telefon: e.target.value })}
                    className="field"
                    inputMode="tel"
                    placeholder="Så dere kan svare"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="label" htmlFor="b-hva">
                    Hva skal lages? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="b-hva"
                    rows={3}
                    value={ny.hva}
                    onChange={(e) => setNy({ ...ny, hva: e.target.value })}
                    className="field resize-none"
                    placeholder="F.eks. «Saksholder i svart PLA, 2 stk. Skal designes fra bunnen. Har sendt mål på SMS.»"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="b-adresse">
                    Adresse
                  </label>
                  <input
                    id="b-adresse"
                    value={ny.adresse}
                    onChange={(e) => setNy({ ...ny, adresse: e.target.value })}
                    className="field"
                    placeholder="Ved hjemlevering"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="b-pris">
                    Avtalt pris
                  </label>
                  <input
                    id="b-pris"
                    type="number"
                    value={ny.pris}
                    onChange={(e) => setNy({ ...ny, pris: e.target.value })}
                    className="field"
                    placeholder="0"
                  />
                </div>

                <div>
                  <span className="label">Levering</span>
                  <div className="flex gap-2">
                    {['Henting', 'Hjemlevering'].map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setNy({ ...ny, levering: l })}
                        className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
                          ny.levering === l
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-ink-200 bg-white text-ink-500'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="label">Betaling</span>
                  <div className="flex gap-2">
                    {['Vipps', 'Kontant'].map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setNy({ ...ny, betalingsmate: l })}
                        className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
                          ny.betalingsmate === l
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-ink-200 bg-white text-ink-500'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="b-frist">
                    Skal være ferdig
                  </label>
                  <input
                    id="b-frist"
                    type="date"
                    value={ny.frist}
                    onChange={(e) => setNy({ ...ny, frist: e.target.value })}
                    className="field"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="b-ansvarlig">
                    Hvem tar den?
                  </label>
                  <select
                    id="b-ansvarlig"
                    value={ny.ansvarlig}
                    onChange={(e) => setNy({ ...ny, ansvarlig: e.target.value })}
                    className="field"
                  >
                    <option value="">Ingen ennå</option>
                    {folk.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={!ny.kunde.trim() || !ny.hva.trim()}
                    className="btn-primary"
                  >
                    Lagre bestillingen
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </section>

      {feil && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{feil}</p>
      )}

      {/* Filter og søk */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {[
            { id: 'aktive', navn: 'På gang' },
            ...STATUSER.map((s) => ({ id: s.verdi, navn: s.tekst })),
            { id: 'alle', navn: 'Alle' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                filter === f.id
                  ? 'border-brand-500 bg-brand-600 text-white'
                  : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300'
              }`}
            >
              {f.navn}
            </button>
          ))}
        </div>

        <input
          value={sok}
          onChange={(e) => setSok(e.target.value)}
          placeholder="Søk etter kunde eller ting"
          className="field sm:w-60"
          aria-label="Søk i bestillinger"
        />
      </div>

      {/* Liste */}
      {laster ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-3xl bg-white/70" />
          ))}
        </div>
      ) : synlige.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-ink-200 bg-white/70 px-6 py-14 text-center text-sm text-ink-500">
          Ingen bestillinger her. Trykk «Ny bestilling» når det kommer inn en melding.
        </p>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {synlige.map((o) => (
              <Kort
                key={o.id}
                o={o}
                folk={folk}
                apen={apen === o.id}
                onToggle={() => setApen(apen === o.id ? null : o.id)}
                onEndre={(patch) => endre(o.id, patch)}
                onSlett={() => slett(o.id)}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

function Kort({
  o,
  folk,
  apen,
  onToggle,
  onEndre,
  onSlett,
}: {
  o: Order;
  folk: TeamMember[];
  apen: boolean;
  onToggle: () => void;
  onEndre: (patch: Partial<Order>) => void;
  onSlett: () => void;
}) {
  const s = statusInfo(o.status);
  const person = folk.find((f) => f.id === o.ansvarlig);
  const frist = datoTekst(o.frist);
  const avsluttet = ['levert', 'avlyst'].includes(o.status);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={`overflow-hidden rounded-3xl border bg-white shadow-soft ${
        avsluttet ? 'border-ink-100 opacity-70' : 'border-ink-200'
      }`}
    >
      <button type="button" onClick={onToggle} className="w-full px-5 py-4 text-left">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${s.farge}`}>
                {s.tekst}
              </span>
              <h3 className="text-base font-semibold text-ink-900">{o.kunde}</h3>
              {o.betalt && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                  Betalt
                </span>
              )}
            </div>
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-600">{o.hva}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              {person && (
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">
                  {person.name}
                </span>
              )}
              {frist && !avsluttet && (
                <span
                  className={`rounded-full px-2.5 py-1 ${
                    frist.rod ? 'bg-red-50 text-red-600' : 'bg-ink-100 text-ink-500'
                  }`}
                >
                  {frist.tekst}
                </span>
              )}
              {o.levering && (
                <span className="rounded-full bg-ink-100 px-2.5 py-1 text-ink-500">
                  {o.levering}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="text-lg font-bold text-ink-900">
              {Math.round(Number(o.pris) || 0)} kr
            </span>
            <motion.span animate={{ rotate: apen ? 180 : 0 }} className="text-ink-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </motion.span>
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {apen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-ink-100 bg-ink-50/50"
          >
            <div className="space-y-5 p-5">
              {/* Status */}
              <div>
                <span className="label">Hvor langt er dere kommet?</span>
                <div className="flex flex-wrap gap-2">
                  {STATUSER.map((st) => (
                    <button
                      key={st.verdi}
                      type="button"
                      onClick={() => onEndre({ status: st.verdi })}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all ${
                        o.status === st.verdi
                          ? st.farge + ' ring-2 ring-offset-1 ring-brand-200'
                          : 'border-ink-200 bg-white text-ink-500 hover:border-brand-300'
                      }`}
                    >
                      {st.tekst}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label">Hva skal lages</label>
                  <textarea
                    rows={3}
                    defaultValue={o.hva}
                    onBlur={(e) => {
                      if (e.target.value !== o.hva) onEndre({ hva: e.target.value });
                    }}
                    className="field resize-y"
                  />
                </div>

                <div>
                  <label className="label">Telefon</label>
                  <input
                    defaultValue={o.telefon ?? ''}
                    onBlur={(e) => {
                      if (e.target.value !== (o.telefon ?? '')) onEndre({ telefon: e.target.value });
                    }}
                    className="field"
                  />
                </div>
                <div>
                  <label className="label">Adresse</label>
                  <input
                    defaultValue={o.adresse ?? ''}
                    onBlur={(e) => {
                      if (e.target.value !== (o.adresse ?? '')) onEndre({ adresse: e.target.value });
                    }}
                    className="field"
                  />
                </div>

                <div>
                  <label className="label">Avtalt pris</label>
                  <input
                    type="number"
                    defaultValue={Number(o.pris) || 0}
                    onBlur={(e) => onEndre({ pris: Number(e.target.value) || 0 })}
                    className="field"
                  />
                </div>
                <div>
                  <label className="label">Skal være ferdig</label>
                  <input
                    type="date"
                    value={o.frist ?? ''}
                    onChange={(e) => onEndre({ frist: e.target.value || null })}
                    className="field"
                  />
                </div>

                <div>
                  <label className="label">Hvem tar den?</label>
                  <select
                    value={o.ansvarlig ?? ''}
                    onChange={(e) => onEndre({ ansvarlig: e.target.value || null })}
                    className="field"
                  >
                    <option value="">Ingen ennå</option>
                    {folk.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="label">Betaling</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEndre({ betalt: !o.betalt })}
                      className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
                        o.betalt
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : 'border-ink-200 bg-white text-ink-500'
                      }`}
                    >
                      {o.betalt ? 'Betalt ✓' : 'Ikke betalt'}
                    </button>
                    <select
                      value={o.betalingsmate ?? 'Vipps'}
                      onChange={(e) => onEndre({ betalingsmate: e.target.value })}
                      className="field w-32"
                      aria-label="Betalingsmåte"
                    >
                      <option>Vipps</option>
                      <option>Kontant</option>
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="label">Notat</label>
                  <textarea
                    rows={2}
                    defaultValue={o.notat ?? ''}
                    onBlur={(e) => {
                      if (e.target.value !== (o.notat ?? '')) onEndre({ notat: e.target.value });
                    }}
                    placeholder="Hva som gjenstår, hva dere ble enige om, lenker."
                    className="field resize-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200/70 pt-4">
                <p className="text-xs text-ink-400">
                  Lagt inn {new Date(o.created_at).toLocaleDateString('nb-NO')}
                  {o.opprettet_av ? ` av ${o.opprettet_av}` : ''}
                </p>
                <div className="flex gap-2">
                  {o.telefon && (
                    <a
                      href={`sms:${o.telefon.replace(/\s/g, '')}`}
                      className="btn-ghost btn-sm"
                    >
                      Send melding
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={onSlett}
                    className="btn btn-sm border border-red-200 bg-white text-red-600 hover:bg-red-50"
                  >
                    Slett
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
