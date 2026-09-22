'use client';

import { useCallback, useEffect, useState } from 'react';
import { lyttPaTabell } from '@/lib/realtime';
import { AnimatePresence, motion } from 'framer-motion';
import { useAdmin } from './AdminProvider';
import type { Profile } from '@/lib/types';

export function Innlogginger() {
  const { supabase, user, profile } = useAdmin();
  const [profiler, setProfiler] = useState<Profile[]>([]);
  const [laster, setLaster] = useState(true);
  const [apen, setApen] = useState(false);

  const [epost, setEpost] = useState('');
  const [navn, setNavn] = useState('');
  const [rolle, setRolle] = useState<'medlem' | 'eier'>('medlem');
  const [maate, setMaate] = useState<'password' | 'invite'>('password');
  const [jobber, setJobber] = useState(false);
  const [feil, setFeil] = useState('');
  const [nyttPassord, setNyttPassord] = useState<{ epost: string; passord: string } | null>(null);
  const [beskjed, setBeskjed] = useState('');

  const erEier = profile?.role === 'eier';

  const hent = useCallback(async () => {
    if (!supabase) return;
    setLaster(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    setProfiler((data as Profile[]) ?? []);
    setLaster(false);
  }, [supabase]);

  useEffect(() => {
    hent();
  }, [hent]);

  useEffect(() => {
    if (!supabase) return;
    return lyttPaTabell(supabase, 'profiles', () => hent());
  }, [supabase, hent]);

  async function token() {
    if (!supabase) return '';
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? '';
  }

  async function leggTil(e: React.FormEvent) {
    e.preventDefault();
    setJobber(true);
    setFeil('');
    setNyttPassord(null);
    setBeskjed('');

    const res = await fetch('/api/ansatte', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await token()}`,
      },
      body: JSON.stringify({ email: epost, name: navn, role: rolle, mode: maate }),
    });
    const data = await res.json();

    if (!res.ok) {
      setFeil(data.error || 'Noe gikk galt.');
      setJobber(false);
      return;
    }

    if (data.password) {
      setNyttPassord({ epost: epost.trim(), passord: data.password });
    } else {
      setBeskjed(`Invitasjon sendt til ${epost.trim()}. Be dem sjekke e-posten sin.`);
    }

    setEpost('');
    setNavn('');
    setJobber(false);
    hent();
  }

  async function endreAnsatt(id: string, patch: { role?: string; name?: string }) {
    setFeil('');
    const res = await fetch('/api/ansatte', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ id, ...patch }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setFeil(data.error || 'Klarte ikke å lagre endringen.');
      return;
    }
    hent();
  }

  async function fjern(id: string, epost: string) {
    if (
      !window.confirm(
        `Fjerne innloggingen til ${epost}? De kan ikke logge inn i adminpanelet lenger. Dette kan ikke angres.`
      )
    )
      return;

    const res = await fetch(`/api/ansatte?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${await token()}` },
    });
    const data = await res.json();
    if (!res.ok) {
      setFeil(data.error || 'Klarte ikke å fjerne brukeren.');
      return;
    }
    hent();
  }

  return (
    <section className="rounded-3xl border border-ink-100 bg-white p-6 shadow-soft sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Hvem kan logge inn</h2>
          <p className="mt-1.5 max-w-xl text-sm text-ink-500">
            De som står her kan åpne adminpanelet og endre nettsiden. «Eier» kan i tillegg legge til
            og fjerne folk.
          </p>
        </div>
        {erEier && (
          <button type="button" onClick={() => setApen((v) => !v)} className="btn-primary btn-sm">
            {apen ? 'Lukk' : '+ Gi noen tilgang'}
          </button>
        )}
      </div>

      {!erEier && (
        <p className="mt-4 rounded-2xl bg-ink-50 px-4 py-3 text-sm text-ink-600">
          Bare eieren av siden kan legge til nye. Spør den som satte opp nettsiden.
        </p>
      )}

      <AnimatePresence initial={false}>
        {apen && erEier && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={leggTil}
            className="overflow-hidden"
          >
            <div className="mt-5 grid gap-4 rounded-2xl border border-brand-200 bg-brand-50/60 p-5 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="ny-navn">
                  Navn
                </label>
                <input
                  id="ny-navn"
                  value={navn}
                  onChange={(e) => setNavn(e.target.value)}
                  className="field"
                  placeholder="Fornavn Etternavn"
                />
              </div>
              <div>
                <label className="label" htmlFor="ny-epost">
                  E-post
                </label>
                <input
                  id="ny-epost"
                  type="email"
                  required
                  value={epost}
                  onChange={(e) => setEpost(e.target.value)}
                  className="field"
                  placeholder="navn@eksempel.no"
                />
              </div>

              <div>
                <span className="label">Hva skal de få lov til?</span>
                <div className="flex gap-2">
                  {(
                    [
                      { id: 'medlem', label: 'Vanlig ansatt' },
                      { id: 'eier', label: 'Eier' },
                    ] as { id: 'medlem' | 'eier'; label: string }[]
                  ).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRolle(r.id)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                        rolle === r.id
                          ? 'border-brand-500 bg-white text-brand-700 ring-4 ring-brand-100'
                          : 'border-ink-200 bg-white/70 text-ink-600'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <p className="hint">Eier kan legge til og fjerne andre. Vanlig ansatt kan endre nettsiden.</p>
              </div>

              <div>
                <span className="label">Hvordan skal de få passord?</span>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: 'password', label: 'Lag passord nå' },
                      { id: 'invite', label: 'Send e-post' },
                    ] as { id: 'password' | 'invite'; label: string }[]
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMaate(m.id)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                        maate === m.id
                          ? 'border-brand-500 bg-white text-brand-700 ring-4 ring-brand-100'
                          : 'border-ink-200 bg-white/70 text-ink-600'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="hint">
                  {maate === 'password'
                    ? 'Du får et passord du kan sende til dem selv. Enklest og virker alltid.'
                    : 'De får en e-post med lenke der de lager sitt eget passord.'}
                </p>
              </div>

              {feil && (
                <p className="sm:col-span-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {feil}
                </p>
              )}

              <div className="sm:col-span-2">
                <button type="submit" disabled={jobber} className="btn-primary">
                  {jobber ? 'Et øyeblikk…' : 'Gi tilgang'}
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {nyttPassord && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h3 className="text-sm font-bold text-emerald-900">Brukeren er klar!</h3>
          <p className="mt-2 text-sm text-emerald-800">
            Send denne informasjonen til {nyttPassord.epost}. Passordet vises bare nå.
          </p>
          <div className="mt-3 rounded-xl bg-white p-4 font-mono text-sm">
            <p>E-post: {nyttPassord.epost}</p>
            <p>Passord: {nyttPassord.passord}</p>
          </div>
          <button
            type="button"
            onClick={() =>
              navigator.clipboard?.writeText(
                `Logg inn på adminpanelet:\nE-post: ${nyttPassord.epost}\nPassord: ${nyttPassord.passord}`
              )
            }
            className="btn-soft btn-sm mt-3"
          >
            Kopier
          </button>
        </div>
      )}

      {beskjed && (
        <p className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {beskjed}
        </p>
      )}

      <ul className="mt-6 divide-y divide-ink-100">
        {laster ? (
          <li className="py-6 text-sm text-ink-400">Henter…</li>
        ) : (
          profiler.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 py-4 sm:gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {(p.name || p.email || '?').slice(0, 1).toUpperCase()}
              </span>

              <div className="min-w-0 flex-1">
                {erEier ? (
                  <input
                    defaultValue={p.name ?? ''}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== (p.name ?? '')) endreAnsatt(p.id, { name: v });
                    }}
                    className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-ink-900 transition-colors hover:border-ink-200 focus:border-brand-400 focus:bg-white focus:outline-none"
                    aria-label={`Navn på ${p.email}`}
                  />
                ) : (
                  <p className="truncate px-2 text-sm font-semibold text-ink-900">
                    {p.name || p.email}
                  </p>
                )}
                <p className="truncate px-2 text-xs text-ink-500">{p.email}</p>
              </div>

              {erEier ? (
                <select
                  value={p.role === 'eier' ? 'eier' : 'medlem'}
                  onChange={(e) => endreAnsatt(p.id, { role: e.target.value })}
                  className="shrink-0 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-bold text-ink-700 focus:border-brand-400 focus:outline-none"
                  aria-label={`Rolle for ${p.email}`}
                >
                  <option value="medlem">Ansatt</option>
                  <option value="eier">Eier</option>
                </select>
              ) : (
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    p.role === 'eier' ? 'bg-brand-50 text-brand-700' : 'bg-ink-100 text-ink-600'
                  }`}
                >
                  {p.role === 'eier' ? 'Eier' : 'Ansatt'}
                </span>
              )}

              {p.id === user?.id && (
                <span className="shrink-0 text-[11px] font-semibold text-ink-400">deg</span>
              )}

              {erEier && p.id !== user?.id && (
                <button
                  type="button"
                  onClick={() => fjern(p.id, p.email || '')}
                  className="shrink-0 text-xs font-semibold text-ink-400 transition-colors hover:text-red-500"
                >
                  Fjern
                </button>
              )}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
