'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAdmin } from './AdminProvider';
import { lyttPaTabell } from '@/lib/realtime';
import { kr } from '@/lib/settings';
import {
  Varelinjer,
  beskriv,
  linjeFraProdukt,
  summer,
  type Linje,
} from './Varelinjer';
import type { Material, Order, OrderItem, Product, TeamMember } from '@/lib/types';

/* ------------------------------------------------------------------ */
/*  Status – fire steg og avlyst. Gamle bestillinger tolkes automatisk */
/* ------------------------------------------------------------------ */

const STATUSER = [
  { verdi: 'ny', tekst: 'Ny', farge: 'bg-amber-50 text-amber-700 border-amber-200' },
  { verdi: 'godkjent', tekst: 'Godkjent', farge: 'bg-brand-50 text-brand-700 border-brand-200' },
  { verdi: 'produksjon', tekst: 'Printes', farge: 'bg-violet-50 text-violet-700 border-violet-200' },
  { verdi: 'levert', tekst: 'Ferdig', farge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { verdi: 'avlyst', tekst: 'Avlyst', farge: 'bg-ink-100 text-ink-500 border-ink-200' },
];

/** Gamle statuser fra før vi forenklet: tilbud og ferdig. */
function normaliser(status: string): string {
  if (status === 'tilbud') return 'ny';
  if (status === 'ferdig') return 'levert';
  return status;
}

function statusInfo(v: string) {
  return STATUSER.find((s) => s.verdi === normaliser(v)) ?? STATUSER[0];
}

const PAGANG = ['ny', 'godkjent', 'produksjon'];

function visDato(iso: string): string {
  return new Date(iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
}

function tallFra(v: string): number {
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/* ------------------------------------------------------------------ */
/*  Skjemaet – brukes både for ny bestilling og når dere redigerer     */
/* ------------------------------------------------------------------ */

type Utkast = {
  kunde: string;
  telefon: string;
  epost: string;
  sendKvittering: boolean;
  adresse: string;
  notat: string;
  levering: string;
  betalingsmate: string;
  frist: string;
  ansvarlig: string;
  pris: string;
  kostnad: string;
  betalt: boolean;
};

function tomtUtkast(): Utkast {
  return {
    kunde: '',
    telefon: '',
    epost: '',
    sendKvittering: true,
    adresse: '',
    notat: '',
    levering: 'Henting',
    betalingsmate: 'Vipps',
    frist: '',
    ansvarlig: '',
    pris: '',
    kostnad: '',
    betalt: false,
  };
}

function OrdreSkjema({
  start,
  startLinjer,
  produkter,
  materialer,
  folk,
  lagreTekst,
  onLagre,
  onAvbryt,
}: {
  start: Utkast;
  startLinjer: Linje[];
  produkter: Product[];
  materialer: Material[];
  folk: TeamMember[];
  lagreTekst: string;
  onLagre: (u: Utkast, linjer: Linje[]) => Promise<void> | void;
  onAvbryt: () => void;
}) {
  const [u, setU] = useState<Utkast>(start);
  const [linjer, setLinjer] = useState<Linje[]>(startLinjer);
  const [lagrer, setLagrer] = useState(false);
  const [feil, setFeil] = useState('');

  const sum = summer(linjer);
  const pris = tallFra(u.pris);
  const kostnad = tallFra(u.kostnad);
  const overskudd = pris - kostnad;

  function sett(patch: Partial<Utkast>) {
    setU((prev) => ({ ...prev, ...patch }));
    if (feil) setFeil('');
  }

  /** Når varelinjene endrer seg, foreslår vi pris og kostnad – men overskriver aldri det dere har skrevet. */
  function endreLinjer(nye: Linje[]) {
    setLinjer(nye);
    const gammel = summer(linjer);
    const neste = summer(nye);
    setU((prev) => ({
      ...prev,
      pris: prev.pris === '' || tallFra(prev.pris) === gammel.salg ? String(neste.salg) : prev.pris,
      kostnad:
        prev.kostnad === '' || tallFra(prev.kostnad) === gammel.kost
          ? String(neste.kost)
          : prev.kostnad,
    }));
  }

  async function lagre() {
    if (u.kunde.trim().split(/\s+/).filter(Boolean).length < 2) {
      setFeil('Skriv hele navnet til kunden – fornavn og etternavn.');
      return;
    }
    if (u.telefon.replace(/\D/g, '').length < 8) {
      setFeil('Skriv mobilnummeret til kunden.');
      return;
    }
    if (linjer.length === 0 && !u.notat.trim()) {
      setFeil('Legg inn minst én vare, eller skriv hva jobben går ut på i notatet.');
      return;
    }
    setLagrer(true);
    try {
      await onLagre(u, linjer);
    } catch {
      setFeil('Klarte ikke å lagre. Prøv igjen.');
    } finally {
      setLagrer(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* 1. Kunden */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">
            Hvem bestiller? <span className="text-red-500">*</span>
          </span>
          <input
            value={u.kunde}
            onChange={(e) => sett({ kunde: e.target.value })}
            placeholder="Ola Nordmann"
            className="field"
          />
        </label>
        <label className="block">
          <span className="label">
            Mobilnummer <span className="text-red-500">*</span>
          </span>
          <input
            value={u.telefon}
            onChange={(e) => sett({ telefon: e.target.value })}
            placeholder="412 34 567"
            className="field"
            inputMode="tel"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="label">E-post</span>
          <input
            value={u.epost}
            onChange={(e) => sett({ epost: e.target.value })}
            placeholder="ola@example.com"
            className="field"
            type="email"
          />
          <span className="hint">Fyll inn hvis kunden skal få kvittering på e-post.</span>
        </label>
      </div>

      {/* 2. Varene */}
      <Varelinjer
        linjer={linjer}
        produkter={produkter}
        materialer={materialer}
        onEndre={endreLinjer}
      />

      {/* 3. Penger */}
      <div className="rounded-2xl border border-ink-200 bg-ink-50/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="label mb-0">Penger</span>
          {linjer.length > 0 && (pris !== sum.salg || kostnad !== sum.kost) && (
            <button
              type="button"
              onClick={() => sett({ pris: String(sum.salg), kostnad: String(sum.kost) })}
              className="text-xs font-semibold text-brand-700 underline-offset-2 hover:underline"
            >
              Bruk tallene fra varelinjene ({kr(sum.salg)} / {kr(sum.kost)})
            </button>
          )}
        </div>

        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-[11px] font-semibold text-ink-500">Vi tok betalt</span>
            <input
              value={u.pris}
              onChange={(e) => sett({ pris: e.target.value })}
              inputMode="decimal"
              placeholder="0"
              className="field mt-0.5"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-ink-500">Vi brukte</span>
            <input
              value={u.kostnad}
              onChange={(e) => sett({ kostnad: e.target.value })}
              inputMode="decimal"
              placeholder="0"
              className="field mt-0.5"
            />
          </label>
          <div>
            <span className="text-[11px] font-semibold text-ink-500">Overskudd</span>
            <p
              className={`mt-2 text-2xl font-bold ${
                overskudd >= 0 ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              {kr(overskudd)}
            </p>
          </div>
        </div>

        <p className="mt-2 text-xs text-ink-500">
          Tallene fylles ut fra varelinjene, men du bestemmer selv. Når bestillingen står som{' '}
          <span className="font-semibold text-ink-700">Ferdig</span>, havner de i økonomien.
        </p>
      </div>

      {/* 4. Praktisk */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className="label">Levering</span>
          <div className="flex gap-2">
            {['Henting', 'Hjemlevering'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => sett({ levering: v })}
                className={`btn btn-sm flex-1 ${
                  u.levering === v ? 'btn-dark' : 'border border-ink-200 bg-white text-ink-700'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Betaling</span>
          <div className="flex gap-2">
            {['Vipps', 'Kontant'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => sett({ betalingsmate: v })}
                className={`btn btn-sm flex-1 ${
                  u.betalingsmate === v ? 'btn-dark' : 'border border-ink-200 bg-white text-ink-700'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {u.levering === 'Hjemlevering' && (
          <label className="block sm:col-span-2">
            <span className="label">Adresse</span>
            <input
              value={u.adresse}
              onChange={(e) => sett({ adresse: e.target.value })}
              placeholder="Vestre Sandslimarka 44"
              className="field"
            />
          </label>
        )}

        <label className="block">
          <span className="label">Skal være ferdig</span>
          <input
            type="date"
            value={u.frist}
            onChange={(e) => sett({ frist: e.target.value })}
            className="field"
          />
        </label>

        <label className="block">
          <span className="label">Hvem tar den?</span>
          <select
            value={u.ansvarlig}
            onChange={(e) => sett({ ansvarlig: e.target.value })}
            className="field"
          >
            <option value="">Ingen ennå</option>
            {folk.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="label">Notat</span>
          <textarea
            rows={2}
            value={u.notat}
            onChange={(e) => sett({ notat: e.target.value })}
            placeholder="Farge, mål, hva dere ble enige om."
            className="field resize-none"
          />
        </label>

        <label className="flex items-center gap-2.5 text-sm font-semibold text-ink-700 sm:col-span-2">
          <input
            type="checkbox"
            checked={u.betalt}
            onChange={(e) => sett({ betalt: e.target.checked })}
            className="h-4 w-4 rounded border-ink-300 text-brand-600"
          />
          Kunden har betalt
        </label>

        <label className="flex items-start gap-2.5 text-sm font-semibold text-ink-700 sm:col-span-2">
          <input
            type="checkbox"
            checked={u.sendKvittering}
            onChange={(e) => sett({ sendKvittering: e.target.checked })}
            disabled={!u.epost.trim()}
            className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600"
          />
          <span>
            Send kvittering på e-post til kunden
            <span className="block text-xs font-normal text-ink-500">
              Kunden får bestillingsnummer, oppsummering og beskjed om at prisen må godkjennes før
              vi starter.
            </span>
          </span>
        </label>
      </div>

      {feil && <p className="text-sm font-semibold text-red-600">{feil}</p>}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={onAvbryt} className="btn btn-sm border border-ink-200 bg-white">
          Avbryt
        </button>
        <button type="button" onClick={lagre} disabled={lagrer} className="btn-primary btn-sm">
          {lagrer ? 'Lagrer …' : lagreTekst}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Selve siden                                                        */
/* ------------------------------------------------------------------ */

export function Bestillinger() {
  const { supabase, profile, user } = useAdmin();
  const [bestillinger, setBestillinger] = useState<Order[]>([]);
  const [linjer, setLinjer] = useState<Record<string, OrderItem[]>>({});
  const [produkter, setProdukter] = useState<Product[]>([]);
  const [materialer, setMaterialer] = useState<Material[]>([]);
  const [folk, setFolk] = useState<TeamMember[]>([]);
  const [laster, setLaster] = useState(true);
  const [mangler, setMangler] = useState(false);
  const [feil, setFeil] = useState('');
  const [filter, setFilter] = useState('pagang');
  const [sok, setSok] = useState('');
  const [nyApen, setNyApen] = useState(false);
  const [redigerer, setRedigerer] = useState<string | null>(null);
  const [apen, setApen] = useState<string | null>(null);

  const hent = useCallback(async () => {
    if (!supabase) return;
    setLaster(true);
    const [b, v, p, m, t] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('order_items').select('*').order('sort'),
      supabase.from('products').select('*').order('sort'),
      supabase.from('materials').select('*').order('sort'),
      supabase.from('team_members').select('*').order('sort'),
    ]);
    if (b.error) {
      setMangler(true);
      setLaster(false);
      return;
    }
    setMangler(false);
    setBestillinger((b.data as Order[]) ?? []);
    setProdukter((p.data as Product[]) ?? []);
    setMaterialer((m.data as Material[]) ?? []);
    setFolk((t.data as TeamMember[]) ?? []);

    const samlet: Record<string, OrderItem[]> = {};
    for (const rad of ((v.data as OrderItem[]) ?? [])) {
      (samlet[rad.order_id] ||= []).push(rad);
    }
    setLinjer(samlet);
    setLaster(false);
  }, [supabase]);

  useEffect(() => {
    hent();
  }, [hent]);

  // Fører noen andre inn en bestilling, ser du den med en gang
  useEffect(() => {
    if (!supabase) return;
    return lyttPaTabell(supabase, 'orders', ({ type, ny, gammel }) => {
      const id = String((ny?.id ?? gammel?.id) ?? '');
      if (!id) return;
      if (type === 'DELETE') {
        setBestillinger((prev) => prev.filter((o) => o.id !== id));
        return;
      }
      setBestillinger((prev) => {
        const finnes = prev.some((o) => o.id === id);
        if (!finnes) return [ny as Order, ...prev];
        return prev.map((o) => (o.id === id ? { ...o, ...(ny as Order) } : o));
      });
    });
  }, [supabase]);

  /* ---------------- Lagring ---------------- */

  function tilRader(orderId: string, liste: Linje[]) {
    return liste
      .filter((l) => l.name.trim() || l.product_id)
      .map((l, i) => ({
        order_id: orderId,
        product_id: l.product_id,
        code: l.code,
        name: l.name.trim() || 'Uten navn',
        qty: l.qty,
        unit_price: l.unit_price,
        unit_cost: l.unit_cost,
        kind: l.kind,
        sort: (i + 1) * 10,
      }));
  }

  async function opprett(u: Utkast, liste: Linje[]) {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('orders')
      .insert({
        kunde: u.kunde.trim(),
        telefon: u.telefon.trim(),
        epost: u.epost.trim(),
        kilde: 'telefon',
        adresse: u.adresse.trim(),
        hva: beskriv(liste) || u.notat.trim(),
        notat: u.notat.trim(),
        pris: tallFra(u.pris),
        kostnad: tallFra(u.kostnad),
        betalt: u.betalt,
        levering: u.levering,
        betalingsmate: u.betalingsmate,
        frist: u.frist || null,
        ansvarlig: u.ansvarlig || null,
        status: 'ny',
        opprettet_av: profile?.name || user?.email || '',
      })
      .select()
      .single();

    if (error || !data) {
      setFeil('Klarte ikke å lagre bestillingen.');
      throw new Error('insert');
    }

    const ordre = data as Order;
    const rader = tilRader(ordre.id, liste);
    let lagrede: OrderItem[] = [];
    if (rader.length > 0) {
      const res = await supabase.from('order_items').insert(rader).select();
      lagrede = (res.data as OrderItem[]) ?? [];
    }

    setBestillinger((prev) => [ordre, ...prev.filter((o) => o.id !== ordre.id)]);
    setLinjer((prev) => ({ ...prev, [ordre.id]: lagrede }));
    setNyApen(false);
    setApen(ordre.id);
    setFeil('');

    // Kvittering til kunden
    if (u.sendKvittering && u.epost.trim()) {
      const { data: okt } = await supabase.auth.getSession();
      const res = await fetch('/api/kvittering', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${okt.session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ id: ordre.id }),
      });
      if (!res.ok) {
        const svar = await res.json().catch(() => ({}));
        setFeil(
          `Bestillingen er lagret, men kvitteringen gikk ikke ut: ${
            svar?.feil ?? 'ukjent feil'
          }`
        );
      }
    }
  }

  async function lagreEndring(id: string, u: Utkast, liste: Linje[]) {
    if (!supabase) return;
    const patch = {
      kunde: u.kunde.trim(),
      telefon: u.telefon.trim(),
      epost: u.epost.trim(),
      adresse: u.adresse.trim(),
      hva: beskriv(liste) || u.notat.trim(),
      notat: u.notat.trim(),
      pris: tallFra(u.pris),
      kostnad: tallFra(u.kostnad),
      betalt: u.betalt,
      levering: u.levering,
      betalingsmate: u.betalingsmate,
      frist: u.frist || null,
      ansvarlig: u.ansvarlig || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('orders').update(patch).eq('id', id);
    if (error) {
      setFeil('Klarte ikke å lagre endringen.');
      throw new Error('update');
    }

    // Enklest og tryggest: bytt ut alle varelinjene
    await supabase.from('order_items').delete().eq('order_id', id);
    const rader = tilRader(id, liste);
    let lagrede: OrderItem[] = [];
    if (rader.length > 0) {
      const res = await supabase.from('order_items').insert(rader).select();
      lagrede = (res.data as OrderItem[]) ?? [];
    }

    setBestillinger((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    setLinjer((prev) => ({ ...prev, [id]: lagrede }));
    setRedigerer(null);
    setFeil('');
  }

  async function settStatus(id: string, status: string) {
    if (!supabase) return;
    setBestillinger((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    const { error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) setFeil('Klarte ikke å lagre statusen.');
  }

  async function settBetalt(id: string, betalt: boolean) {
    if (!supabase) return;
    setBestillinger((prev) => prev.map((o) => (o.id === id ? { ...o, betalt } : o)));
    await supabase.from('orders').update({ betalt }).eq('id', id);
  }

  async function slett(id: string) {
    if (!supabase) return;
    if (!window.confirm('Slette denne bestillingen? Det kan ikke angres.')) return;
    setBestillinger((prev) => prev.filter((o) => o.id !== id));
    await supabase.from('orders').delete().eq('id', id);
  }

  /* ---------------- Utregninger ---------------- */

  const synlige = useMemo(() => {
    const q = sok.trim().toLowerCase();
    return bestillinger.filter((o) => {
      const st = normaliser(o.status);
      if (filter === 'pagang' && !PAGANG.includes(st)) return false;
      if (filter === 'ubetalt' && (o.betalt || st === 'avlyst')) return false;
      if (!['pagang', 'ubetalt', 'alle'].includes(filter) && st !== filter) return false;
      if (!q) return true;
      return [o.kunde, o.hva, o.telefon, o.notat]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [bestillinger, filter, sok]);

  const tall = useMemo(() => {
    const naa = new Date();
    const ferdige = bestillinger.filter((o) => normaliser(o.status) === 'levert');
    const denneMnd = ferdige.filter((o) => {
      const d = new Date(o.created_at);
      return d.getMonth() === naa.getMonth() && d.getFullYear() === naa.getFullYear();
    });
    const ubetalt = bestillinger.filter((o) => !o.betalt && normaliser(o.status) !== 'avlyst');
    return {
      pagang: bestillinger.filter((o) => PAGANG.includes(normaliser(o.status))).length,
      ubetaltAntall: ubetalt.length,
      ubetaltSum: ubetalt.reduce((s, o) => s + Number(o.pris ?? 0), 0),
      inn: denneMnd.reduce((s, o) => s + Number(o.pris ?? 0), 0),
      ut: denneMnd.reduce((s, o) => s + Number(o.kostnad ?? 0), 0),
    };
  }, [bestillinger]);

  const bestselgere = useMemo(() => {
    const talt = new Map<
      string,
      { navn: string; kode: string; antall: number; omsetning: number; overskudd: number }
    >();
    let totalt = 0;

    for (const o of bestillinger) {
      if (normaliser(o.status) === 'avlyst') continue;
      for (const l of linjer[o.id] ?? []) {
        const nokkel = l.product_id ?? `egen:${l.name.toLowerCase().trim()}`;
        const rad = talt.get(nokkel) ?? {
          navn: l.name || 'Uten navn',
          kode: l.kind === 'galleri' ? l.code ?? '' : '',
          antall: 0,
          omsetning: 0,
          overskudd: 0,
        };
        const antall = Number(l.qty) || 0;
        rad.antall += antall;
        rad.omsetning += antall * Number(l.unit_price);
        rad.overskudd += antall * (Number(l.unit_price) - Number(l.unit_cost));
        talt.set(nokkel, rad);
        totalt += antall;
      }
    }

    const liste = [...talt.values()].sort((a, b) => b.antall - a.antall);
    return {
      liste,
      totalt,
      omsetning: liste.reduce((s, r) => s + r.omsetning, 0),
      overskudd: liste.reduce((s, r) => s + r.overskudd, 0),
      hoyeste: liste[0]?.antall ?? 1,
    };
  }, [bestillinger, linjer]);

  function utkastFra(o: Order): Utkast {
    return {
      kunde: o.kunde ?? '',
      telefon: o.telefon ?? '',
      epost: o.epost ?? '',
      sendKvittering: false,
      adresse: o.adresse ?? '',
      notat: o.notat ?? '',
      levering: o.levering ?? 'Henting',
      betalingsmate: o.betalingsmate ?? 'Vipps',
      frist: o.frist ?? '',
      ansvarlig: o.ansvarlig ?? '',
      pris: String(Number(o.pris ?? 0)),
      kostnad: String(Number(o.kostnad ?? 0)),
      betalt: Boolean(o.betalt),
    };
  }

  function linjerFra(o: Order): Linje[] {
    return (linjer[o.id] ?? []).map((l) => ({
      lokalId: l.id,
      product_id: l.product_id,
      code: l.code ?? '',
      name: l.name,
      qty: Number(l.qty) || 1,
      unit_price: Number(l.unit_price) || 0,
      unit_cost: Number(l.unit_cost) || 0,
      kind: (l.kind === 'egen' ? 'egen' : 'galleri') as 'egen' | 'galleri',
    }));
  }

  if (mangler) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        Bestillingene er ikke satt opp i databasen ennå. Kjør{' '}
        <code className="rounded bg-white px-1.5 py-0.5">supabase/okonomi.sql</code> i Supabase, så
        dukker de opp her.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Tall */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
          <p className="text-3xl font-bold text-ink-900">{tall.pagang}</p>
          <p className="mt-1 text-sm text-ink-500">på gang</p>
        </div>
        <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
          <p className="text-3xl font-bold text-ink-900">{kr(tall.ubetaltSum)}</p>
          <p className="mt-1 text-sm text-ink-500">
            venter på betaling ({tall.ubetaltAntall} stk)
          </p>
        </div>
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-3xl font-bold text-emerald-800">{kr(tall.inn)}</p>
          <p className="mt-1 text-sm text-emerald-700">solgt for denne måneden</p>
        </div>
        <div className="rounded-3xl border border-brand-200 bg-brand-50 p-5">
          <p className="text-3xl font-bold text-brand-800">{kr(tall.inn - tall.ut)}</p>
          <p className="mt-1 text-sm text-brand-700">overskudd denne måneden</p>
        </div>
      </div>

      {feil && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{feil}</p>
      )}

      {/* Ny bestilling */}
      <div className="rounded-3xl border border-brand-200 bg-white shadow-soft">
        {nyApen ? (
          <div className="p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Ny bestilling</h2>
            </div>
            <OrdreSkjema
              start={tomtUtkast()}
              startLinjer={[]}
              produkter={produkter}
              materialer={materialer}
              folk={folk}
              lagreTekst="Lagre bestillingen"
              onLagre={opprett}
              onAvbryt={() => setNyApen(false)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setNyApen(true)}
            className="flex w-full items-center gap-3 p-5 text-left"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-600 text-xl font-bold text-white">
              +
            </span>
            <span>
              <span className="block font-bold text-ink-900">Ny bestilling</span>
              <span className="block text-sm text-ink-500">
                Velg modeller fra galleriet eller skriv inn jobben selv
              </span>
            </span>
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {[
            { id: 'pagang', navn: 'På gang' },
            { id: 'ubetalt', navn: 'Ikke betalt' },
            { id: 'levert', navn: 'Ferdige' },
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
          Ingen bestillinger her ennå.
        </p>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {synlige.map((o) => {
              const st = statusInfo(o.status);
              const ferdig = normaliser(o.status) === 'levert';
              const overskudd = Number(o.pris ?? 0) - Number(o.kostnad ?? 0);
              const varer = linjer[o.id] ?? [];

              return (
                <motion.li
                  key={o.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-soft"
                >
                  {/* Topp */}
                  <button
                    type="button"
                    onClick={() => {
                      setApen(apen === o.id ? null : o.id);
                      setRedigerer(null);
                    }}
                    className="w-full px-5 py-4 text-left"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${st.farge}`}
                          >
                            {st.tekst}
                          </span>
                          <span className="font-bold text-ink-900">{o.kunde || 'Uten navn'}</span>
                          {o.ordrenr && (
                            <span className="rounded-full bg-ink-900 px-2 py-0.5 text-[11px] font-bold text-white">
                              #{o.ordrenr}
                            </span>
                          )}
                          {o.kilde === 'nett' && (
                            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                              Fra nettsiden
                            </span>
                          )}
                          {o.betalt ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                              Betalt
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                              Ikke betalt
                            </span>
                          )}
                          <span className="text-xs text-ink-400">{visDato(o.created_at)}</span>
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-sm text-ink-600">
                          {o.hva || 'Ingen beskrivelse'}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-bold text-ink-900">{kr(Number(o.pris ?? 0))}</p>
                        <p
                          className={`text-xs font-semibold ${
                            overskudd >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {kr(overskudd)} igjen
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Åpen */}
                  <AnimatePresence initial={false}>
                    {apen === o.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-ink-100 bg-ink-50/40"
                      >
                        <div className="space-y-4 p-5">
                          {redigerer === o.id ? (
                            <OrdreSkjema
                              start={utkastFra(o)}
                              startLinjer={linjerFra(o)}
                              produkter={produkter}
                              materialer={materialer}
                              folk={folk}
                              lagreTekst="Lagre endringene"
                              onLagre={(u, liste) => lagreEndring(o.id, u, liste)}
                              onAvbryt={() => setRedigerer(null)}
                            />
                          ) : (
                            <>
                              {/* Status */}
                              <div>
                                <p className="label">Hvor langt er dere kommet?</p>
                                <div className="flex flex-wrap gap-2">
                                  {STATUSER.map((s) => (
                                    <button
                                      key={s.verdi}
                                      type="button"
                                      onClick={() => settStatus(o.id, s.verdi)}
                                      className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                                        normaliser(o.status) === s.verdi
                                          ? s.farge
                                          : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300'
                                      }`}
                                    >
                                      {s.tekst}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Varer */}
                              {varer.length > 0 && (
                                <div className="rounded-2xl border border-ink-200 bg-white p-4">
                                  <p className="label">Varer</p>
                                  <ul className="divide-y divide-ink-100">
                                    {varer.map((l) => (
                                      <li key={l.id} className="flex items-center gap-2 py-2">
                                        {l.kind === 'galleri' && l.code && (
                                          <span className="shrink-0 rounded-full bg-ink-900 px-2 py-0.5 text-[10px] font-bold text-white">
                                            {l.code}
                                          </span>
                                        )}
                                        <span className="min-w-0 flex-1 truncate text-sm text-ink-800">
                                          {l.qty}x {l.name}
                                        </span>
                                        <span className="shrink-0 text-sm font-semibold text-ink-900">
                                          {kr(Number(l.qty) * Number(l.unit_price))}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Penger */}
                              <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl bg-white p-3.5">
                                  <p className="text-[11px] font-semibold text-ink-500">Vi tok betalt</p>
                                  <p className="mt-0.5 text-lg font-bold text-ink-900">
                                    {kr(Number(o.pris ?? 0))}
                                  </p>
                                </div>
                                <div className="rounded-2xl bg-white p-3.5">
                                  <p className="text-[11px] font-semibold text-ink-500">Vi brukte</p>
                                  <p className="mt-0.5 text-lg font-bold text-ink-900">
                                    {kr(Number(o.kostnad ?? 0))}
                                  </p>
                                </div>
                                <div
                                  className={`rounded-2xl p-3.5 ${
                                    overskudd >= 0 ? 'bg-emerald-50' : 'bg-red-50'
                                  }`}
                                >
                                  <p
                                    className={`text-[11px] font-semibold ${
                                      overskudd >= 0 ? 'text-emerald-700' : 'text-red-600'
                                    }`}
                                  >
                                    Overskudd
                                  </p>
                                  <p
                                    className={`mt-0.5 text-lg font-bold ${
                                      overskudd >= 0 ? 'text-emerald-800' : 'text-red-700'
                                    }`}
                                  >
                                    {kr(overskudd)}
                                  </p>
                                </div>
                              </div>

                              {ferdig && (
                                <p className="rounded-2xl bg-emerald-50 px-4 py-2.5 text-[13px] font-semibold text-emerald-800">
                                  Ført i økonomien: {kr(Number(o.pris ?? 0))} inn,{' '}
                                  {kr(Number(o.kostnad ?? 0))} ut.
                                </p>
                              )}

                              {/* Detaljer */}
                              <div className="grid gap-2 text-sm text-ink-600 sm:grid-cols-2">
                                <p>
                                  <span className="font-semibold text-ink-800">Levering:</span>{' '}
                                  {o.levering}
                                  {o.adresse ? ` · ${o.adresse}` : ''}
                                </p>
                                <p>
                                  <span className="font-semibold text-ink-800">Betaling:</span>{' '}
                                  {o.betalingsmate}
                                </p>
                                {o.telefon && (
                                  <p>
                                    <span className="font-semibold text-ink-800">Telefon:</span>{' '}
                                    <a href={`tel:${o.telefon}`} className="text-brand-700">
                                      {o.telefon}
                                    </a>
                                  </p>
                                )}
                                {o.epost && (
                                  <p>
                                    <span className="font-semibold text-ink-800">E-post:</span>{' '}
                                    <a href={`mailto:${o.epost}`} className="text-brand-700">
                                      {o.epost}
                                    </a>
                                  </p>
                                )}
                                {o.frist && (
                                  <p>
                                    <span className="font-semibold text-ink-800">Frist:</span>{' '}
                                    {visDato(o.frist + 'T00:00:00')}
                                  </p>
                                )}
                                {o.notat && <p className="sm:col-span-2">{o.notat}</p>}
                              </div>

                              {/* Knapper */}
                              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-200/70 pt-3">
                                <label className="flex items-center gap-2 text-sm font-semibold text-ink-700">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(o.betalt)}
                                    onChange={(e) => settBetalt(o.id, e.target.checked)}
                                    className="h-4 w-4 rounded border-ink-300 text-brand-600"
                                  />
                                  Betalt
                                </label>

                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setRedigerer(o.id)}
                                    className="btn btn-sm border border-ink-200 bg-white text-ink-700"
                                  >
                                    Rediger
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => slett(o.id)}
                                    className="btn btn-sm border border-red-200 bg-white text-red-600 hover:bg-red-50"
                                  >
                                    Slett
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
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

      {/* Hva selger best */}
      <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">
            Hva selger best
          </p>
          {bestselgere.totalt > 0 && (
            <p className="text-xs font-semibold text-ink-500">
              {bestselgere.totalt} solgt · {kr(bestselgere.omsetning)} · {kr(bestselgere.overskudd)}{' '}
              i overskudd
            </p>
          )}
        </div>

        {bestselgere.liste.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-ink-50 px-4 py-5 text-sm text-ink-500">
            Ingen varer ført ennå. Legg inn en bestilling med varer, så dukker topplisten opp her.
          </p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {bestselgere.liste.slice(0, 8).map((r) => (
              <li key={`${r.kode}-${r.navn}`}>
                <div className="flex flex-wrap items-center gap-2">
                  {r.kode && (
                    <span className="rounded-full bg-ink-900 px-2 py-0.5 text-[10px] font-bold text-white">
                      {r.kode}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">
                    {r.navn}
                  </span>
                  <span className="shrink-0 text-sm font-bold text-ink-900">{r.antall} stk</span>
                  <span className="shrink-0 text-xs font-semibold text-ink-500">
                    {kr(r.omsetning)} · {kr(r.overskudd)} igjen
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${Math.max(4, (r.antall / bestselgere.hoyeste) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
