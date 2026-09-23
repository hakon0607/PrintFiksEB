'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAdmin } from './AdminProvider';

export function Login() {
  const { supabase } = useAdmin();
  const [epost, setEpost] = useState('');
  const [passord, setPassord] = useState('');
  const [feil, setFeil] = useState('');
  const [jobber, setJobber] = useState(false);
  const [glemt, setGlemt] = useState(false);
  const [sendt, setSendt] = useState(false);

  async function loggInn(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setJobber(true);
    setFeil('');
    const { error } = await supabase.auth.signInWithPassword({
      email: epost.trim(),
      password: passord,
    });
    if (error) {
      setFeil(
        error.message.toLowerCase().includes('invalid')
          ? 'Feil e-post eller passord. Prøv igjen.'
          : 'Klarte ikke å logge inn akkurat nå. Prøv igjen om litt.'
      );
    }
    setJobber(false);
  }

  async function sendTilbakestilling(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setJobber(true);
    setFeil('');
    const { error } = await supabase.auth.resetPasswordForEmail(epost.trim(), {
      redirectTo: `${window.location.origin}/admin/nytt-passord`,
    });
    if (error) setFeil('Klarte ikke å sende e-post. Sjekk at adressen er riktig.');
    else setSendt(true);
    setJobber(false);
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[420px]"
      >
        <div className="rounded-[2rem] border border-ink-100 bg-white p-8 shadow-lift">
          <div className="relative mx-auto h-12 w-12 overflow-hidden rounded-2xl">
            <Image src="/logo-mark.png" alt="" fill sizes="48px" className="object-contain" />
          </div>
          <h1 className="mt-5 text-center text-2xl font-bold">
            {glemt ? 'Glemt passord' : 'Logg inn'}
          </h1>
          <p className="mt-2 text-center text-sm leading-relaxed text-ink-500">
            {glemt
              ? 'Skriv inn e-posten din, så sender vi deg en lenke for å lage nytt passord.'
              : 'Bare for dere som jobber i PrintFiksEB.'}
          </p>

          {sendt ? (
            <div className="mt-6 rounded-2xl bg-emerald-50 p-5 text-center text-sm text-emerald-800">
              Sjekk e-posten din! Vi har sendt deg en lenke. Husk å se i søppelpost.
            </div>
          ) : (
            <form onSubmit={glemt ? sendTilbakestilling : loggInn} className="mt-6 space-y-4">
              <div>
                <label className="label" htmlFor="epost">
                  E-post
                </label>
                <input
                  id="epost"
                  type="email"
                  required
                  value={epost}
                  onChange={(e) => setEpost(e.target.value)}
                  className="field"
                  autoComplete="email"
                  placeholder="navn@eksempel.no"
                />
              </div>

              {!glemt && (
                <div>
                  <label className="label" htmlFor="passord">
                    Passord
                  </label>
                  <input
                    id="passord"
                    type="password"
                    required
                    value={passord}
                    onChange={(e) => setPassord(e.target.value)}
                    className="field"
                    autoComplete="current-password"
                    placeholder="••••••••"
                  />
                </div>
              )}

              {feil && (
                <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {feil}
                </p>
              )}

              <button type="submit" disabled={jobber} className="btn-primary w-full">
                {jobber ? 'Et øyeblikk…' : glemt ? 'Send lenke' : 'Logg inn'}
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={() => {
              setGlemt((v) => !v);
              setFeil('');
              setSendt(false);
            }}
            className="mt-5 w-full text-center text-sm font-semibold text-brand-700 hover:underline"
          >
            {glemt ? 'Tilbake til innlogging' : 'Glemt passord?'}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-ink-500">
          <Link href="/" className="link-underline font-semibold text-ink-700">
            Tilbake til nettsiden
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
