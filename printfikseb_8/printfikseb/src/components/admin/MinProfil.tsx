'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAdmin } from './AdminProvider';
import { ImageUpload } from './ImageUpload';
import type { TeamMember } from '@/lib/types';

export function MinProfil() {
  const { supabase, user, profile, refreshProfile } = useAdmin();

  const [navn, setNavn] = useState('');
  const [rolle, setRolle] = useState('');
  const [bio, setBio] = useState('');
  const [bilde, setBilde] = useState('');
  const [vises, setVises] = useState(true);
  const [kort, setKort] = useState<TeamMember | null>(null);
  const [laster, setLaster] = useState(true);
  const [status, setStatus] = useState<'' | 'lagrer' | 'lagret' | 'feil'>('');

  const [passord, setPassord] = useState('');
  const [gjenta, setGjenta] = useState('');
  const [pwStatus, setPwStatus] = useState('');
  const [pwFeil, setPwFeil] = useState('');

  const hent = useCallback(async () => {
    if (!supabase || !user) return;
    setLaster(true);
    const { data } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const t = (data as TeamMember) ?? null;
    setKort(t);
    setNavn(profile?.name || t?.name || '');
    setRolle(t?.role ?? '');
    setBio(t?.bio ?? '');
    setBilde(t?.avatar_url ?? '');
    setVises(t?.show_on_site ?? true);
    setLaster(false);
  }, [supabase, user, profile]);

  useEffect(() => {
    hent();
  }, [hent]);

  async function lagre(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user) return;
    setStatus('lagrer');

    const p1 = supabase.from('profiles').update({ name: navn.trim() }).eq('id', user.id);

    const felter = {
      name: navn.trim() || user.email || 'Uten navn',
      role: rolle.trim(),
      bio: bio.trim(),
      avatar_url: bilde,
      show_on_site: vises,
      email: user.email ?? '',
    };

    const p2 = kort
      ? supabase.from('team_members').update(felter).eq('id', kort.id)
      : supabase.from('team_members').insert({ ...felter, user_id: user.id, sort: 100 });

    const [r1, r2] = await Promise.all([p1, p2]);
    if (r1.error || r2.error) {
      setStatus('feil');
      return;
    }

    await refreshProfile();
    await hent();
    setStatus('lagret');
    window.setTimeout(() => setStatus(''), 2200);
  }

  async function byttPassord(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setPwFeil('');
    setPwStatus('');
    if (passord.length < 8) {
      setPwFeil('Passordet må ha minst 8 tegn.');
      return;
    }
    if (passord !== gjenta) {
      setPwFeil('De to passordene er ikke like.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: passord });
    if (error) {
      setPwFeil('Klarte ikke å endre passordet. Logg ut og inn igjen, og prøv på nytt.');
      return;
    }
    setPassord('');
    setGjenta('');
    setPwStatus('Passordet er endret.');
    window.setTimeout(() => setPwStatus(''), 4000);
  }

  if (laster) {
    return <div className="h-64 animate-pulse rounded-3xl bg-white/70" />;
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={lagre}
        className="rounded-3xl border border-ink-100 bg-white p-6 shadow-soft sm:p-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Om deg</h2>
          <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-bold text-ink-600">
            {profile?.role === 'eier' ? 'Eier' : 'Ansatt'}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-ink-500">
          Dette vises på «Om oss»-siden. E-posten din ({user?.email}) kan bare eieren endre.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ImageUpload
              value={bilde}
              onChange={setBilde}
              label="Bilde av deg"
              help="Valgfritt. Uten bilde vises initialene dine."
            />
          </div>

          <div>
            <label className="label" htmlFor="mitt-navn">
              Navn
            </label>
            <input
              id="mitt-navn"
              value={navn}
              onChange={(e) => setNavn(e.target.value)}
              className="field"
              placeholder="Fornavn Etternavn"
            />
          </div>

          <div>
            <label className="label" htmlFor="min-rolle">
              Hva gjør du i bedriften?
            </label>
            <input
              id="min-rolle"
              value={rolle}
              onChange={(e) => setRolle(e.target.value)}
              className="field"
              placeholder="F.eks. Daglig leder, Produksjon, Design"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="min-bio">
              Kort om deg
            </label>
            <textarea
              id="min-bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="field resize-none"
              placeholder="En eller to setninger. F.eks. hva du liker å lage."
            />
          </div>

          <div className="sm:col-span-2">
            <span className="label">Vis meg på nettsiden</span>
            <button
              type="button"
              onClick={() => setVises((v) => !v)}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                vises
                  ? 'border-brand-300 bg-brand-50 text-brand-700'
                  : 'border-ink-200 bg-white text-ink-500'
              }`}
            >
              <span
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  vises ? 'bg-brand-600' : 'bg-ink-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    vises ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </span>
              {vises ? 'Ja, vis meg' : 'Nei, skjul meg'}
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={status === 'lagrer'} className="btn-primary">
            {status === 'lagrer' ? 'Lagrer…' : 'Lagre profilen'}
          </button>
          <AnimatePresence>
            {status === 'lagret' && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm font-semibold text-emerald-600"
              >
                Lagret ✓ Husk å publisere for at det skal vises på nettsiden.
              </motion.span>
            )}
            {status === 'feil' && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm font-semibold text-red-600"
              >
                Klarte ikke å lagre. Prøv igjen.
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </form>

      {/* Passord */}
      <form
        onSubmit={byttPassord}
        className="rounded-3xl border border-ink-100 bg-white p-6 shadow-soft sm:p-7"
      >
        <h2 className="text-lg font-semibold">Bytt passord</h2>
        <p className="mt-1.5 text-sm text-ink-500">
          Velg noe du husker. Minst 8 tegn.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="nytt-pw">
              Nytt passord
            </label>
            <input
              id="nytt-pw"
              type="password"
              value={passord}
              onChange={(e) => setPassord(e.target.value)}
              className="field"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label" htmlFor="nytt-pw2">
              Gjenta passordet
            </label>
            <input
              id="nytt-pw2"
              type="password"
              value={gjenta}
              onChange={(e) => setGjenta(e.target.value)}
              className="field"
              autoComplete="new-password"
            />
          </div>
        </div>

        {pwFeil && (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {pwFeil}
          </p>
        )}
        {pwStatus && (
          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {pwStatus}
          </p>
        )}

        <button type="submit" disabled={!passord} className="btn-ghost mt-5">
          Lagre nytt passord
        </button>
      </form>
    </div>
  );
}
