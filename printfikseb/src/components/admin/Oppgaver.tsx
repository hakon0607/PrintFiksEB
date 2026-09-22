'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAdmin } from './AdminProvider';
import { lyttPaTabell } from '@/lib/realtime';
import type { Task, TeamMember } from '@/lib/types';

const HASTER = [
  { verdi: 'lav', tekst: 'Kan vente', farge: 'bg-ink-100 text-ink-600' },
  { verdi: 'normal', tekst: 'Vanlig', farge: 'bg-brand-50 text-brand-700' },
  { verdi: 'hoy', tekst: 'Haster', farge: 'bg-red-50 text-red-600' },
];

function hasterInfo(verdi: string) {
  return HASTER.find((h) => h.verdi === verdi) ?? HASTER[1];
}

function datoTekst(iso: string | null): { tekst: string; tone: 'rod' | 'gul' | 'grå' } | null {
  if (!iso) return null;
  const i_dag = new Date();
  i_dag.setHours(0, 0, 0, 0);
  const d = new Date(iso + 'T00:00:00');
  const dager = Math.round((d.getTime() - i_dag.getTime()) / 86400000);
  if (dager < 0) return { tekst: `${Math.abs(dager)} dag${Math.abs(dager) === 1 ? '' : 'er'} på overtid`, tone: 'rod' };
  if (dager === 0) return { tekst: 'I dag', tone: 'rod' };
  if (dager === 1) return { tekst: 'I morgen', tone: 'gul' };
  if (dager <= 7) return { tekst: `Om ${dager} dager`, tone: 'gul' };
  return { tekst: d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }), tone: 'grå' };
}

export function Oppgaver() {
  const { supabase, profile, user } = useAdmin();
  const [oppgaver, setOppgaver] = useState<Task[]>([]);
  const [folk, setFolk] = useState<TeamMember[]>([]);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState('');
  const [mangler, setMangler] = useState(false);
  const [visFerdige, setVisFerdige] = useState(false);
  const [filter, setFilter] = useState<string>('alle');

  // Ny oppgave
  const [tittel, setTittel] = useState('');
  const [hvem, setHvem] = useState('');
  const [frist, setFrist] = useState('');
  const [haster, setHaster] = useState('normal');

  const minId = useMemo(
    () => folk.find((f) => f.user_id && f.user_id === user?.id)?.id ?? '',
    [folk, user]
  );

  const hent = useCallback(async () => {
    if (!supabase) return;
    setLaster(true);
    const [o, t] = await Promise.all([
      supabase.from('tasks').select('*').order('done').order('due_date', { nullsFirst: false }).order('created_at'),
      supabase.from('team_members').select('*').order('sort'),
    ]);
    if (o.error) {
      setMangler(true);
      setLaster(false);
      return;
    }
    setMangler(false);
    setOppgaver((o.data as Task[]) ?? []);
    setFolk((t.data as TeamMember[]) ?? []);
    setLaster(false);
  }, [supabase]);

  useEffect(() => {
    hent();
  }, [hent]);

  // Legger noen andre til en oppgave eller huker den av, ser du det med en gang
  useEffect(() => {
    if (!supabase) return;
    return lyttPaTabell(supabase, 'tasks', ({ type, ny, gammel }) => {
      const id = String((ny?.id ?? gammel?.id) ?? '');
      if (!id) return;
      if (type === 'DELETE') {
        setOppgaver((prev) => prev.filter((o) => o.id !== id));
        return;
      }
      setOppgaver((prev) => {
        const finnes = prev.some((o) => o.id === id);
        if (!finnes) return [ny as Task, ...prev];
        return prev.map((o) => (o.id === id ? { ...o, ...(ny as Task) } : o));
      });
    });
  }, [supabase]);

  async function leggTil(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !tittel.trim()) return;
    const ny = {
      title: tittel.trim(),
      assigned_to: hvem || null,
      due_date: frist || null,
      priority: haster,
      created_by: profile?.name || user?.email || '',
    };
    const { data, error } = await supabase.from('tasks').insert(ny).select().single();
    if (error || !data) {
      setFeil('Klarte ikke å legge til oppgaven.');
      return;
    }
    setOppgaver((prev) => [data as Task, ...prev]);
    setTittel('');
    setFrist('');
    setHaster('normal');
  }

  async function endre(id: string, patch: Partial<Task>) {
    if (!supabase) return;
    setOppgaver((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    const { error } = await supabase.from('tasks').update(patch).eq('id', id);
    if (error) setFeil('Klarte ikke å lagre endringen.');
  }

  async function slett(id: string) {
    if (!supabase) return;
    if (!window.confirm('Slette denne oppgaven?')) return;
    setOppgaver((prev) => prev.filter((o) => o.id !== id));
    await supabase.from('tasks').delete().eq('id', id);
  }

  function kryssAv(o: Task) {
    const naa = !o.done;
    endre(o.id, {
      done: naa,
      done_at: naa ? new Date().toISOString() : null,
      done_by: naa ? profile?.name || user?.email || '' : null,
    });
  }

  const synlige = oppgaver.filter((o) => {
    if (filter === 'mine') return o.assigned_to === minId;
    if (filter === 'ufordelt') return !o.assigned_to;
    if (filter !== 'alle') return o.assigned_to === filter;
    return true;
  });

  const aGjore = synlige.filter((o) => !o.done);
  const ferdige = synlige.filter((o) => o.done);

  if (mangler) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        Oppgavelisten er ikke satt opp ennå. Kjør{' '}
        <code className="rounded bg-white px-1.5 py-0.5">supabase/schema.sql</code> på nytt i
        Supabase, så dukker den opp her.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Ny oppgave */}
      <form
        onSubmit={leggTil}
        className="rounded-3xl border border-brand-200 bg-brand-50/60 p-5 sm:p-6"
      >
        <label className="label" htmlFor="ny-oppgave">
          Hva skal gjøres?
        </label>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <input
            id="ny-oppgave"
            value={tittel}
            onChange={(e) => setTittel(e.target.value)}
            placeholder="F.eks. «Ta bilder av nøkkelringene til galleriet»"
            className="field flex-1"
          />
          <button type="submit" disabled={!tittel.trim()} className="btn-primary shrink-0">
            Legg til
          </button>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="ny-hvem">
              Hvem gjør det?
            </label>
            <select
              id="ny-hvem"
              value={hvem}
              onChange={(e) => setHvem(e.target.value)}
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
            <label className="label" htmlFor="ny-frist">
              Frist
            </label>
            <input
              id="ny-frist"
              type="date"
              value={frist}
              onChange={(e) => setFrist(e.target.value)}
              className="field"
            />
          </div>
          <div>
            <span className="label">Hastegrad</span>
            <div className="flex gap-1.5">
              {HASTER.map((h) => (
                <button
                  key={h.verdi}
                  type="button"
                  onClick={() => setHaster(h.verdi)}
                  className={`flex-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-all ${
                    haster === h.verdi
                      ? 'border-brand-500 bg-white text-brand-700 ring-2 ring-brand-100'
                      : 'border-ink-200 bg-white/70 text-ink-500'
                  }`}
                >
                  {h.tekst}
                </button>
              ))}
            </div>
          </div>
        </div>
      </form>

      {feil && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{feil}</p>
      )}

      {/* Filter */}
      {folk.length > 0 && (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {[
            { id: 'alle', navn: 'Alle' },
            ...(minId ? [{ id: 'mine', navn: 'Mine' }] : []),
            { id: 'ufordelt', navn: 'Ufordelt' },
            ...folk.map((f) => ({ id: f.id, navn: f.name })),
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
      )}

      {/* Å gjøre */}
      <section className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Å gjøre</h2>
          <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-bold text-ink-600">
            {aGjore.length}
          </span>
        </div>

        {laster ? (
          <div className="mt-5 space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-ink-50" />
            ))}
          </div>
        ) : aGjore.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-ink-200 px-5 py-10 text-center text-sm text-ink-500">
            Ingenting å gjøre her. Godt jobbet! 🎉
          </p>
        ) : (
          <ul className="mt-5 space-y-2.5">
            <AnimatePresence initial={false}>
              {aGjore.map((o) => (
                <Rad
                  key={o.id}
                  oppgave={o}
                  folk={folk}
                  onKryss={() => kryssAv(o)}
                  onEndre={(patch) => endre(o.id, patch)}
                  onSlett={() => slett(o.id)}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>

      {/* Ferdig */}
      {ferdige.length > 0 && (
        <section className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft sm:p-6">
          <button
            type="button"
            onClick={() => setVisFerdige((v) => !v)}
            className="flex w-full items-center justify-between gap-4 text-left"
          >
            <h2 className="text-lg font-semibold text-ink-500">Ferdig</h2>
            <span className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                {ferdige.length}
              </span>
              <motion.span animate={{ rotate: visFerdige ? 180 : 0 }} className="text-ink-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </motion.span>
            </span>
          </button>

          <AnimatePresence initial={false}>
            {visFerdige && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2.5 overflow-hidden"
              >
                <div className="h-5" />
                {ferdige.map((o) => (
                  <Rad
                    key={o.id}
                    oppgave={o}
                    folk={folk}
                    onKryss={() => kryssAv(o)}
                    onEndre={(patch) => endre(o.id, patch)}
                    onSlett={() => slett(o.id)}
                  />
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </section>
      )}
    </div>
  );
}

function Rad({
  oppgave,
  folk,
  onKryss,
  onEndre,
  onSlett,
}: {
  oppgave: Task;
  folk: TeamMember[];
  onKryss: () => void;
  onEndre: (patch: Partial<Task>) => void;
  onSlett: () => void;
}) {
  const [apen, setApen] = useState(false);
  const person = folk.find((f) => f.id === oppgave.assigned_to);
  const frist = datoTekst(oppgave.due_date);
  const h = hasterInfo(oppgave.priority);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={`overflow-hidden rounded-2xl border transition-colors ${
        oppgave.done ? 'border-ink-100 bg-ink-50/60' : 'border-ink-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-3 p-3.5">
        <button
          type="button"
          onClick={onKryss}
          aria-label={oppgave.done ? 'Merk som ikke ferdig' : 'Merk som ferdig'}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors ${
            oppgave.done
              ? 'border-emerald-500 bg-emerald-500'
              : 'border-ink-300 bg-white hover:border-brand-500'
          }`}
        >
          {oppgave.done && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 13l4 4L19 7"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        <button type="button" onClick={() => setApen((v) => !v)} className="min-w-0 flex-1 text-left">
          <span
            className={`block text-sm font-semibold ${
              oppgave.done ? 'text-ink-400 line-through' : 'text-ink-900'
            }`}
          >
            {oppgave.title}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {person && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-0.5 pl-0.5 pr-2.5 text-[11px] font-semibold text-brand-700">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {person.name.slice(0, 1).toUpperCase()}
                </span>
                {person.name}
              </span>
            )}
            {!person && !oppgave.done && (
              <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-semibold text-ink-500">
                Ufordelt
              </span>
            )}
            {frist && !oppgave.done && (
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  frist.tone === 'rod'
                    ? 'bg-red-50 text-red-600'
                    : frist.tone === 'gul'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-ink-100 text-ink-500'
                }`}
              >
                {frist.tekst}
              </span>
            )}
            {oppgave.priority !== 'normal' && !oppgave.done && (
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${h.farge}`}>
                {h.tekst}
              </span>
            )}
            {oppgave.done && oppgave.done_by && (
              <span className="text-[11px] text-ink-400">Ferdig av {oppgave.done_by}</span>
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setApen((v) => !v)}
          className="shrink-0 rounded-full p-1.5 text-ink-400 transition-colors hover:bg-ink-50"
          aria-label={apen ? 'Lukk' : 'Endre'}
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
            className="overflow-hidden border-t border-ink-100 bg-ink-50/60"
          >
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Oppgave</label>
                <input
                  defaultValue={oppgave.title}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== oppgave.title) onEndre({ title: v });
                  }}
                  className="field"
                />
              </div>

              <div>
                <label className="label">Hvem gjør det?</label>
                <select
                  value={oppgave.assigned_to ?? ''}
                  onChange={(e) => onEndre({ assigned_to: e.target.value || null })}
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
                <label className="label">Frist</label>
                <input
                  type="date"
                  value={oppgave.due_date ?? ''}
                  onChange={(e) => onEndre({ due_date: e.target.value || null })}
                  className="field"
                />
              </div>

              <div className="sm:col-span-2">
                <span className="label">Hastegrad</span>
                <div className="flex gap-1.5">
                  {HASTER.map((hh) => (
                    <button
                      key={hh.verdi}
                      type="button"
                      onClick={() => onEndre({ priority: hh.verdi })}
                      className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${
                        oppgave.priority === hh.verdi
                          ? 'border-brand-500 bg-white text-brand-700 ring-2 ring-brand-100'
                          : 'border-ink-200 bg-white text-ink-500'
                      }`}
                    >
                      {hh.tekst}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="label">Notat</label>
                <textarea
                  rows={2}
                  defaultValue={oppgave.notes ?? ''}
                  onBlur={(e) => {
                    if (e.target.value !== (oppgave.notes ?? '')) onEndre({ notes: e.target.value });
                  }}
                  placeholder="Detaljer, lenker eller hva som mangler."
                  className="field resize-none"
                />
              </div>

              <div className="sm:col-span-2 flex justify-end border-t border-ink-200/70 pt-3">
                <button
                  type="button"
                  onClick={onSlett}
                  className="btn btn-sm border border-red-200 bg-white text-red-600 hover:bg-red-50"
                >
                  Slett oppgaven
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
