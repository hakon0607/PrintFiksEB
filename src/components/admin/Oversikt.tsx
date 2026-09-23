'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAdmin } from './AdminProvider';
import { regnMargin } from '@/lib/margin';
import { kr } from '@/lib/settings';
import type { Finance, Material, Order, Product, Task } from '@/lib/types';

const PAGANG = ['ny', 'tilbud', 'godkjent', 'produksjon'];

/** En bestilling teller i regnskapet når den er ferdig. «ferdig» er den gamle verdien. */
function erFerdig(o: Order): boolean {
  return o.status === 'levert' || o.status === 'ferdig';
}

function startAvManeden(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1);
}

function visDato(iso: string): string {
  return new Date(iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
}

function Kort({
  tall,
  tekst,
  tone = 'vanlig',
  href,
}: {
  tall: string | number;
  tekst: string;
  tone?: 'vanlig' | 'gronn' | 'rod' | 'bla';
  href?: string;
}) {
  const farger = {
    vanlig: 'border-ink-100 bg-white text-ink-900',
    gronn: 'border-emerald-100 bg-emerald-50 text-emerald-800',
    rod: 'border-red-100 bg-red-50 text-red-700',
    bla: 'border-brand-200 bg-brand-50 text-brand-800',
  }[tone];

  const innhold = (
    <div className={`h-full rounded-3xl border p-5 shadow-soft transition-all ${farger} ${
      href ? 'hover:-translate-y-0.5 hover:shadow-lift' : ''
    }`}>
      <p className="text-3xl font-bold">{tall}</p>
      <p className="mt-1 text-sm opacity-80">{tekst}</p>
    </div>
  );

  return href ? <Link href={href}>{innhold}</Link> : innhold;
}

export function Oversikt() {
  const { supabase, user } = useAdmin();
  const [produkter, setProdukter] = useState<Product[]>([]);
  const [ordrer, setOrdrer] = useState<Order[]>([]);
  const [poster, setPoster] = useState<Finance[]>([]);
  const [oppgaver, setOppgaver] = useState<Task[]>([]);
  const [materialer, setMaterialer] = useState<Material[]>([]);
  const [ansatte, setAnsatte] = useState(0);
  const [upublisert, setUpublisert] = useState(false);
  const [laster, setLaster] = useState(true);

  const hent = useCallback(async () => {
    if (!supabase) return;
    const [p, o, f, t, m, a, st] = await Promise.all([
      supabase.from('products').select('*').order('sort'),
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(300),
      supabase.from('finances').select('*').order('dato', { ascending: false }).limit(500),
      supabase.from('tasks').select('*').order('due_date', { nullsFirst: false }).limit(200),
      supabase.from('materials').select('*').order('sort'),
      supabase.from('team_members').select('id', { count: 'exact', head: true }),
      supabase.from('site_status').select('*').eq('id', 1).maybeSingle(),
    ]);
    setProdukter((p.data as Product[]) ?? []);
    setOrdrer((o.data as Order[]) ?? []);
    setPoster((f.data as Finance[]) ?? []);
    setOppgaver((t.data as Task[]) ?? []);
    setMaterialer((m.data as Material[]) ?? []);
    setAnsatte(a.count ?? 0);
    const s = st.data as { sist_endret?: string; sist_publisert?: string } | null;
    setUpublisert(
      Boolean(s?.sist_endret && (!s.sist_publisert || new Date(s.sist_endret) > new Date(s.sist_publisert)))
    );
    setLaster(false);
  }, [supabase]);

  useEffect(() => {
    hent();
  }, [hent]);

  const fra = startAvManeden();

  const bestilling = useMemo(() => {
    const nye = ordrer.filter((o) => o.status === 'ny' || o.status === 'tilbud');
    const paagang = ordrer.filter((o) => PAGANG.includes(o.status));
    const venter = ordrer.filter((o) => !o.betalt && o.status !== 'avlyst');
    const levertMnd = ordrer.filter((o) => erFerdig(o) && new Date(o.created_at) >= fra);
    return {
      nye,
      paagang,
      venter,
      levertMnd,
      venterSum: venter.reduce((s, o) => s + Number(o.pris ?? 0), 0),
      betaltSum: levertMnd.reduce((s, o) => s + Number(o.pris ?? 0), 0),
      kostSum: levertMnd.reduce((s, o) => s + Number(o.kostnad ?? 0), 0),
    };
  }, [ordrer, fra]);

  const okonomi = useMemo(() => {
    const iMnd = poster.filter((p) => new Date(p.dato + 'T00:00:00') >= fra);
    const egenInn = iMnd.filter((p) => p.type === 'inntekt').reduce((s, p) => s + Number(p.belop), 0);
    const egenUt = iMnd.filter((p) => p.type !== 'inntekt').reduce((s, p) => s + Number(p.belop), 0);
    const inn = egenInn + bestilling.betaltSum;
    const ut = egenUt + bestilling.kostSum;
    return { inn, ut, overskudd: inn - ut };
  }, [poster, fra, bestilling.betaltSum, bestilling.kostSum]);

  const galleri = useMemo(() => {
    const aktive = produkter.filter((p) => p.active !== false);
    const med = aktive
      .map((p) => ({ p, m: regnMargin(p as unknown as Record<string, unknown>, materialer) }))
      .filter((x) => x.m.pris > 0 && (x.m.egenKostpris || (x.m.kjentMateriale && x.m.vekt > 0)));
    const sortert = [...med].sort((a, b) => (b.m.prosent ?? 0) - (a.m.prosent ?? 0));
    const snittPris = aktive.length
      ? aktive.reduce((s, p) => s + Number(p.price ?? 0), 0) / aktive.length
      : 0;
    const snittMargin = med.length
      ? med.reduce((s, x) => s + (x.m.prosent ?? 0), 0) / med.length
      : null;
    return {
      antall: produkter.length,
      aktive: aktive.length,
      snittPris,
      snittMargin,
      beste: sortert[0],
      svakeste: sortert[sortert.length - 1],
      tap: med.filter((x) => x.m.overskudd <= 0),
      utenTall: aktive.length - med.length,
    };
  }, [produkter, materialer]);

  const oppgaveTall = useMemo(() => {
    const i_dag = new Date();
    i_dag.setHours(0, 0, 0, 0);
    const apne = oppgaver.filter((o) => !o.done);
    const overtid = apne.filter((o) => o.due_date && new Date(o.due_date + 'T00:00:00') < i_dag);
    return { apne, overtid, neste: apne.slice(0, 4) };
  }, [oppgaver]);

  const varsler = [
    bestilling.nye.length > 0 && {
      tekst: `${bestilling.nye.length} ny${bestilling.nye.length === 1 ? '' : 'e'} bestilling${
        bestilling.nye.length === 1 ? '' : 'er'
      } som ikke er svart på`,
      href: '/admin/bestillinger',
    },
    bestilling.venter.length > 0 && {
      tekst: `${bestilling.venter.length} venter på betaling (${kr(bestilling.venterSum)})`,
      href: '/admin/bestillinger',
    },
    oppgaveTall.overtid.length > 0 && {
      tekst: `${oppgaveTall.overtid.length} oppgave${
        oppgaveTall.overtid.length === 1 ? '' : 'r'
      } har gått over fristen`,
      href: '/admin/oppgaver',
    },
    galleri.tap.length > 0 && {
      tekst: `${galleri.tap.length} modell${
        galleri.tap.length === 1 ? '' : 'er'
      } koster mer enn de selges for`,
      href: '/admin/galleri',
    },
    upublisert && {
      tekst: 'Dere har endringer som ikke er publisert ennå',
      href: '/admin',
    },
  ].filter(Boolean) as { tekst: string; href: string }[];

  if (laster) {
    return <p className="text-sm text-ink-500">Henter tallene …</p>;
  }

  return (
    <div className="space-y-6">
      {/* Trenger blikket ditt */}
      {varsler.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-amber-200 bg-amber-50 p-5"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-700">
            Trenger blikket deres
          </p>
          <ul className="mt-3 space-y-2">
            {varsler.map((v) => (
              <li key={v.tekst}>
                <Link
                  href={v.href}
                  className="text-sm font-semibold text-amber-900 underline-offset-4 hover:underline"
                >
                  {v.tekst}
                </Link>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Nøkkeltall */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kort tall={bestilling.nye.length} tekst="nye bestillinger" href="/admin/bestillinger" />
        <Kort tall={bestilling.paagang.length} tekst="bestillinger på gang" href="/admin/bestillinger" />
        <Kort
          tall={kr(bestilling.venterSum)}
          tekst="venter på betaling"
          tone={bestilling.venterSum > 0 ? 'rod' : 'vanlig'}
          href="/admin/bestillinger"
        />
        <Kort
          tall={kr(okonomi.overskudd)}
          tekst="overskudd denne måneden"
          tone={okonomi.overskudd >= 0 ? 'gronn' : 'rod'}
          href="/admin/okonomi"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Økonomi */}
        <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">
              Denne måneden
            </p>
            <Link href="/admin/okonomi" className="text-xs font-semibold text-brand-700">
              Se økonomi
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-emerald-50 px-3.5 py-3">
              <p className="text-xs font-semibold text-emerald-700">Inn</p>
              <p className="mt-0.5 text-lg font-bold text-emerald-800">{kr(okonomi.inn)}</p>
            </div>
            <div className="rounded-2xl bg-red-50 px-3.5 py-3">
              <p className="text-xs font-semibold text-red-600">Ut</p>
              <p className="mt-0.5 text-lg font-bold text-red-700">{kr(okonomi.ut)}</p>
            </div>
            <div className="rounded-2xl bg-brand-50 px-3.5 py-3">
              <p className="text-xs font-semibold text-brand-700">Igjen</p>
              <p className="mt-0.5 text-lg font-bold text-brand-800">{kr(okonomi.overskudd)}</p>
            </div>
          </div>

          <p className="mt-3 text-[13px] leading-relaxed text-ink-600">
            {bestilling.levertMnd.length} bestilling
            {bestilling.levertMnd.length === 1 ? '' : 'er'} ferdig denne måneden.{' '}
            {bestilling.betaltSum > 0
              ? `${kr(bestilling.betaltSum)} inn, ${kr(bestilling.kostSum)} brukt på dem.`
              : 'Ingen er ført som ferdige ennå.'}
          </p>
        </div>

        {/* Galleri */}
        <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">
              Modellene
            </p>
            <Link href="/admin/galleri" className="text-xs font-semibold text-brand-700">
              Se galleriet
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-ink-50 px-3.5 py-3">
              <p className="text-xs font-semibold text-ink-500">Modeller</p>
              <p className="mt-0.5 text-lg font-bold text-ink-900">{galleri.aktive}</p>
            </div>
            <div className="rounded-2xl bg-ink-50 px-3.5 py-3">
              <p className="text-xs font-semibold text-ink-500">Snittpris</p>
              <p className="mt-0.5 text-lg font-bold text-ink-900">{kr(galleri.snittPris)}</p>
            </div>
            <div className="rounded-2xl bg-ink-50 px-3.5 py-3">
              <p className="text-xs font-semibold text-ink-500">Snittmargin</p>
              <p className="mt-0.5 text-lg font-bold text-ink-900">
                {galleri.snittMargin === null ? '–' : `${Math.round(galleri.snittMargin)} %`}
              </p>
            </div>
          </div>

          <ul className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-ink-600">
            {galleri.beste && (
              <li>
                Best margin: <span className="font-semibold text-ink-800">{galleri.beste.p.name}</span>{' '}
                ({Math.round(galleri.beste.m.prosent ?? 0)} %, {kr(galleri.beste.m.overskudd)} igjen)
              </li>
            )}
            {galleri.svakeste && galleri.svakeste.p.id !== galleri.beste?.p.id && (
              <li>
                Svakest:{' '}
                <span className="font-semibold text-ink-800">{galleri.svakeste.p.name}</span> (
                {Math.round(galleri.svakeste.m.prosent ?? 0)} %, {kr(galleri.svakeste.m.overskudd)}{' '}
                igjen)
              </li>
            )}
            {galleri.utenTall > 0 && (
              <li className="text-ink-500">
                {galleri.utenTall} modell{galleri.utenTall === 1 ? '' : 'er'} mangler kostpris, så de
                er ikke med i snittet.
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Siste bestillinger */}
        <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">
              Siste bestillinger
            </p>
            <Link href="/admin/bestillinger" className="text-xs font-semibold text-brand-700">
              Se alle
            </Link>
          </div>

          {ordrer.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-ink-50 px-4 py-4 text-sm text-ink-500">
              Ingen bestillinger ført ennå. Når noen sender dere en melding, fører dere den inn under
              Bestillinger.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-ink-100">
              {ordrer.slice(0, 5).map((o) => (
                <li key={o.id} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-900">
                      {o.kunde || 'Uten navn'}
                    </span>
                    <span className="block truncate text-xs text-ink-500">
                      {visDato(o.created_at)} · {o.hva || 'Ingen beskrivelse'}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-bold text-ink-900">
                      {kr(Number(o.pris ?? 0))}
                    </span>
                    <span
                      className={`block text-[11px] font-semibold ${
                        o.betalt ? 'text-emerald-600' : 'text-ink-400'
                      }`}
                    >
                      {o.betalt ? 'Betalt' : o.status}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Oppgaver */}
        <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">
              Oppgaver
            </p>
            <Link href="/admin/oppgaver" className="text-xs font-semibold text-brand-700">
              Se alle
            </Link>
          </div>

          <p className="mt-3 text-sm text-ink-600">
            <span className="font-semibold text-ink-900">{oppgaveTall.apne.length}</span> åpne
            {oppgaveTall.overtid.length > 0 && (
              <>
                , <span className="font-semibold text-red-600">{oppgaveTall.overtid.length}</span> over
                fristen
              </>
            )}
            .
          </p>

          {oppgaveTall.neste.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-ink-50 px-4 py-4 text-sm text-ink-500">
              Ingenting står igjen. Fint jobba.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {oppgaveTall.neste.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center gap-3 rounded-2xl border border-ink-100 px-3.5 py-2.5"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-800">{o.title}</span>
                  {o.due_date && (
                    <span className="shrink-0 text-xs font-semibold text-ink-500">
                      {visDato(o.due_date + 'T00:00:00')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-ink-100 bg-ink-50/70 p-5">
        <p className="text-sm leading-relaxed text-ink-700">
          <span className="font-semibold text-ink-900">Husk:</span> endringer dere gjør her lagres av
          seg selv, men de vises ikke på nettsiden før dere trykker{' '}
          <span className="font-semibold text-ink-900">Publiser</span> øverst. Det gjelder priser,
          tekster, modeller og bilder. Økonomi, oppgaver og bestillinger er interne og trenger ingen
          publisering.
        </p>
        <p className="mt-3 text-xs text-ink-500">
          {ansatte} ansatte er lagt inn. Du er logget inn som {user?.email}.
        </p>
      </div>
    </div>
  );
}
