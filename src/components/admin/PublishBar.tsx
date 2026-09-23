'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAdmin } from './AdminProvider';

type Status = {
  sist_endret: string | null;
  sist_publisert: string | null;
  publisert_av: string | null;
};

function tidSiden(iso: string | null): string {
  if (!iso) return 'aldri';
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'nå nettopp';
  if (min < 60) return `for ${min} min siden`;
  const timer = Math.floor(min / 60);
  if (timer < 24) return `for ${timer} ${timer === 1 ? 'time' : 'timer'} siden`;
  const dager = Math.floor(timer / 24);
  if (dager === 1) return 'i går';
  if (dager < 30) return `for ${dager} dager siden`;
  return new Date(iso).toLocaleDateString('nb-NO');
}

export function PublishBar() {
  const { supabase, user } = useAdmin();
  const [status, setStatus] = useState<Status | null>(null);
  const [jobber, setJobber] = useState(false);
  const [feil, setFeil] = useState('');
  const [nettoppPublisert, setNettoppPublisert] = useState(false);
  const [mangler, setMangler] = useState(false);

  const hent = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('site_status')
      .select('sist_endret, sist_publisert, publisert_av')
      .eq('id', 1)
      .maybeSingle();
    if (error) {
      setMangler(true);
      return;
    }
    setMangler(!data);
    if (data) setStatus(data as Status);
  }, [supabase]);

  useEffect(() => {
    if (!user) return;
    hent();
    const id = window.setInterval(hent, 12000);
    const påFokus = () => hent();
    window.addEventListener('focus', påFokus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', påFokus);
    };
  }, [hent, user]);

  const harEndringer =
    !!status?.sist_endret &&
    (!status.sist_publisert ||
      new Date(status.sist_endret).getTime() > new Date(status.sist_publisert).getTime());

  async function publiser() {
    if (!supabase) return;
    setJobber(true);
    setFeil('');
    const { data } = await supabase.auth.getSession();
    const res = await fetch('/api/publiser', {
      method: 'POST',
      headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` },
    });
    const svar = await res.json().catch(() => ({}));
    if (!res.ok) {
      setFeil(svar.error || 'Klarte ikke å publisere. Prøv igjen om litt.');
      setJobber(false);
      return;
    }
    await hent();
    setJobber(false);
    setNettoppPublisert(true);
    window.setTimeout(() => setNettoppPublisert(false), 4000);
  }

  if (mangler) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        Publiseringen er ikke satt opp ennå. Kjør{' '}
        <code className="rounded bg-white px-1.5 py-0.5">supabase/schema.sql</code> på nytt i
        Supabase, så dukker knappen opp her.
      </div>
    );
  }

  return (
    <div
      className={`rounded-3xl border px-5 py-4 transition-colors ${
        harEndringer ? 'border-amber-300 bg-amber-50' : 'border-ink-100 bg-white'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              harEndringer ? 'bg-amber-400/25 text-amber-700' : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {harEndringer ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 8v5m0 3.5h.01M10.3 3.9 2.6 17.4A2 2 0 0 0 4.3 20.4h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="m5 13 4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <div>
            <p className="text-sm font-semibold text-ink-900">
              {harEndringer ? 'Du har endringer som ikke er publisert' : 'Nettsiden er oppdatert'}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
              {harEndringer
                ? 'Endringene er lagret, men de vises ikke for kundene før du trykker «Publiser».'
                : `Sist publisert ${tidSiden(status?.sist_publisert ?? null)}${
                    status?.publisert_av ? ` av ${status.publisert_av}` : ''
                  }.`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/?forhandsvis=1"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost btn-sm"
            title="Åpner nettsiden med de nyeste endringene, uten å publisere"
          >
            Forhåndsvis
          </a>
          <button
            type="button"
            onClick={publiser}
            disabled={jobber}
            className={harEndringer ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
          >
            {jobber ? 'Publiserer…' : harEndringer ? 'Publiser endringene' : 'Publiser på nytt'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {(nettoppPublisert || feil) && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`overflow-hidden pt-3 text-sm font-semibold ${
              feil ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {feil || 'Publisert! Endringene er synlige på nettsiden nå.'}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
