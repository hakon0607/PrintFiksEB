'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdmin } from './AdminProvider';

type Status = {
  finnes: boolean;
  kilde?: 'admin' | 'vercel' | null;
  maskert?: string;
  oppdatert?: string;
  av?: string;
};

export function AiNokkel() {
  const { supabase, profile } = useAdmin();
  const erEier = profile?.role === 'eier';

  const [apen, setApen] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [nokkel, setNokkel] = useState('');
  const [lagrer, setLagrer] = useState(false);
  const [feil, setFeil] = useState('');
  const [ok, setOk] = useState('');

  const token = useCallback(async () => {
    if (!supabase) return '';
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? '';
  }, [supabase]);

  const hentStatus = useCallback(async () => {
    const res = await fetch('/api/ai-nokkel', {
      headers: { Authorization: `Bearer ${await token()}` },
    });
    if (res.ok) setStatus(await res.json());
  }, [token]);

  useEffect(() => {
    hentStatus();
  }, [hentStatus]);

  async function lagre(e: React.FormEvent) {
    e.preventDefault();
    setLagrer(true);
    setFeil('');
    setOk('');
    const res = await fetch('/api/ai-nokkel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ key: nokkel }),
    });
    const svar = await res.json().catch(() => ({}));
    if (!res.ok) setFeil(svar.error || 'Klarte ikke å lagre nøkkelen.');
    else {
      setNokkel('');
      setOk('Nøkkelen er lagret. Nå kan alle i gruppa bruke «Finpuss med AI».');
      window.setTimeout(() => setOk(''), 5000);
      hentStatus();
    }
    setLagrer(false);
  }

  async function slett() {
    if (!window.confirm('Slette AI-nøkkelen? Da slutter «Finpuss med AI» å virke for alle.')) return;
    await fetch('/api/ai-nokkel', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${await token()}` },
    });
    hentStatus();
  }

  const fraVercel = status?.kilde === 'vercel';

  // Er nøkkelen på plass og du ikke er eier, er det ingenting å gjøre her
  if (status?.finnes && !erEier) return null;

  return (
    <section
      className={`overflow-hidden rounded-3xl border shadow-soft ${
        status?.finnes ? 'border-ink-100 bg-white' : 'border-amber-200 bg-amber-50'
      }`}
    >
      <button
        type="button"
        onClick={() => setApen((v) => !v)}
        className="flex w-full items-center gap-3 px-6 py-4 text-left"
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            status?.finnes ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-400/25 text-amber-700'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 3v2m0 14v2M5.6 5.6 7 7m10 10 1.4 1.4M3 12h2m14 0h2M5.6 18.4 7 17m10-10 1.4-1.4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink-900">
            {status?.finnes
              ? fraVercel
                ? 'AI-nøkkel ligger i Vercel'
                : 'AI-nøkkel er lagt inn'
              : 'AI-nøkkel mangler'}
          </span>
          <span className="mt-0.5 block text-[13px] text-ink-600">
            {status?.finnes
              ? fraVercel
                ? `${status.maskert} · satt opp som miljøvariabel`
                : `${status.maskert}${status.av ? ` · lagt inn av ${status.av}` : ''}`
              : erEier
                ? 'Legg den inn her, eller som OPENAI_API_KEY i Vercel. Begge deler virker.'
                : 'Be eieren legge den inn, så virker «Finpuss med AI».'}
          </span>
        </span>
        <motion.span animate={{ rotate: apen ? 180 : 0 }} className="shrink-0 text-ink-400">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {apen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-ink-100/70 p-6">
              {status?.finnes && fraVercel ? (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed text-ink-600">
                    Nøkkelen er lagt inn som miljøvariabelen{' '}
                    <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-xs">
                      OPENAI_API_KEY
                    </code>{' '}
                    i Vercel. Da er alt i orden – dere trenger ikke gjøre noe her.
                  </p>
                  <p className="text-xs leading-relaxed text-ink-500">
                    Vil dere heller kunne bytte nøkkel uten å gå innom Vercel, kan du lime inn en
                    her. Da er det den som gjelder.
                  </p>
                  {erEier && (
                    <form onSubmit={lagre}>
                      <div className="flex flex-col gap-2.5 sm:flex-row">
                        <input
                          type="password"
                          value={nokkel}
                          onChange={(e) => setNokkel(e.target.value)}
                          placeholder="sk-..."
                          className="field flex-1 font-mono"
                          autoComplete="off"
                          aria-label="OpenAI-nøkkel"
                        />
                        <button
                          type="submit"
                          disabled={lagrer || !nokkel.trim()}
                          className="btn-ghost shrink-0"
                        >
                          {lagrer ? 'Lagrer…' : 'Bruk denne i stedet'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : status?.finnes ? (
                erEier && (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-ink-600">
                      Nøkkelen ligger trygt på serveren. Ingen får se den igjen – heller ikke du.
                    </p>
                    <button
                      type="button"
                      onClick={slett}
                      className="btn btn-sm border border-red-200 bg-white text-red-600 hover:bg-red-50"
                    >
                      Slett nøkkelen
                    </button>
                  </div>
                )
              ) : erEier ? (
                <form onSubmit={lagre}>
                  <label className="label" htmlFor="ai-nokkel">
                    Lim inn OpenAI-nøkkelen
                  </label>
                  <div className="flex flex-col gap-2.5 sm:flex-row">
                    <input
                      id="ai-nokkel"
                      type="password"
                      value={nokkel}
                      onChange={(e) => setNokkel(e.target.value)}
                      placeholder="sk-..."
                      className="field flex-1 font-mono"
                      autoComplete="off"
                    />
                    <button
                      type="submit"
                      disabled={lagrer || !nokkel.trim()}
                      className="btn-primary shrink-0"
                    >
                      {lagrer ? 'Lagrer…' : 'Lagre'}
                    </button>
                  </div>
                  <p className="hint">
                    Hentes på platform.openai.com under «API keys». Del den aldri utenfor bedriften.
                    Alternativt kan dere legge den inn som{' '}
                    <code className="rounded bg-ink-100 px-1 py-0.5 font-mono text-[11px]">
                      OPENAI_API_KEY
                    </code>{' '}
                    i Vercel i stedet.
                  </p>
                </form>
              ) : (
                <p className="text-sm text-ink-600">
                  Bare eieren kan legge inn nøkkelen.
                </p>
              )}

              {feil && (
                <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
                  {feil}
                </p>
              )}
              {ok && (
                <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
                  {ok}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
