'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

type Vare = { navn: string; antall: number; pris: string };

type Kvittering = {
  ordrenr: string;
  navn: string;
  telefon: string;
  epost: string;
  adresse: string;
  levering: string;
  betaling: string;
  kommentar: string;
  varer: Vare[];
  sum: string;
  fastPris?: boolean;
};

const STEG_VANLIG = [
  {
    t: 'Vi tar kontakt',
    d: 'Vi ringer eller sender melding så fort vi kan, for å avtale detaljene – og om vi trenger å møtes eller måle opp noe.',
  },
  {
    t: 'Du får endelig pris',
    d: 'Prisen under er et estimat. Du får en endelig pris fra oss som du må godkjenne før vi starter å printe.',
  },
  { t: 'Vi printer', d: 'Når du har sagt ja, setter vi i gang. Vanligvis ferdig på 2–4 virkedager.' },
  { t: 'Henting eller levering', d: 'Du henter hos oss på Sandsli, eller vi kjører det hjem til deg.' },
];

const STEG_FAST = [
  {
    t: 'Fast pris – vi er i gang',
    d: 'Du har bestilt ferdige modeller til fast pris, så vi trenger ingen godkjenning. Vi setter i gang med en gang.',
  },
  {
    t: 'Vi tar kontakt om noe er uklart',
    d: 'Er det noe vi lurer på – farge, antall eller levering – ringer vi eller sender melding.',
  },
  { t: 'Vi printer', d: 'Vanligvis ferdig på 2–4 virkedager.' },
  { t: 'Henting eller levering', d: 'Du henter hos oss på Sandsli, eller vi kjører det hjem til deg.' },
];

export default function BestiltSide() {
  const [k, setK] = useState<Kvittering | null>(null);
  const [lastet, setLastet] = useState(false);
  const [kopiert, setKopiert] = useState(false);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem('printfikseb_kvittering');
      if (raw) setK(JSON.parse(raw) as Kvittering);
    } catch {
      /* ikke kritisk */
    }
    setLastet(true);
  }, []);

  return (
    <main className="relative py-14 sm:py-20">
      <div className="container-x max-w-3xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16 }}
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white shadow-lift"
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
            <motion.path
              d="M5 12.5 10 17.5 19 7"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
            />
          </svg>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6 text-center text-balance text-3xl font-bold sm:text-4xl"
        >
          Takk for bestillingen!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="mx-auto mt-3 max-w-xl text-center text-[15px] leading-relaxed text-ink-600"
        >
          {k?.fastPris
            ? 'Vi har fått bestillingen din. Dette er ferdige modeller til fast pris, så vi setter i gang med en gang – du trenger ikke godkjenne noe.'
            : 'Vi har fått bestillingen din og tar kontakt så fort vi kan. Du får en endelig pris fra oss som du må godkjenne før vi starter å printe.'}
        </motion.p>

        {k?.ordrenr && (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="mt-5 text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700">
              Bestilling #{k.ordrenr}
            </span>
          </motion.p>
        )}

        {lastet && k && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34 }}
            className="mt-7 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 sm:p-6"
          >
            <div className="flex items-start gap-4">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-white"
                aria-hidden
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 7l9 6 9-6M3 7h18v10H3z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-ink-900 sm:text-lg">
                  Bekreftelsen er sendt
                </h2>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink-700">
                  Du får en bekreftelse på e-post med en gang, med bestillingsnummer og oversikt over
                  det du har bestilt. Finner du den ikke, sjekk søppelpost.
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
                  Når bestillingen er ferdig, sender vi en kvittering med endelig pris.
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="btn-dark btn-sm no-print"
                  >
                    Lagre som PDF
                  </button>
                  {k.ordrenr && (
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          navigator.clipboard.writeText(k.ordrenr);
                          setKopiert(true);
                          window.setTimeout(() => setKopiert(false), 2500);
                        } catch {
                          /* ikke kritisk */
                        }
                      }}
                      className="btn-ghost btn-sm no-print"
                    >
                      {kopiert ? 'Kopiert!' : 'Kopier bestillingsnummer'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stegene */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {(k?.fastPris ? STEG_FAST : STEG_VANLIG).map((s, i) => (
            <motion.div
              key={s.t}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 + i * 0.07 }}
              className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-ink-900 text-sm font-bold text-white">
                {i + 1}
              </span>
              <h2 className="mt-3 text-base font-semibold">{s.t}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{s.d}</p>
            </motion.div>
          ))}
        </div>

        {/* Oppsummering */}
        {lastet && k && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-6 overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-soft"
          >
            <div className="border-b border-ink-100 px-5 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">
                Dette bestilte du
              </p>
            </div>

            <ul className="divide-y divide-ink-100 px-5">
              {k.varer.map((v, i) => (
                <li key={`${v.navn}-${i}`} className="flex items-center gap-3 py-3">
                  <span className="grid h-7 min-w-7 place-items-center rounded-full bg-brand-50 px-2 text-xs font-bold text-brand-700">
                    {v.antall}×
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-ink-800">{v.navn}</span>
                  <span className="shrink-0 text-sm font-semibold text-ink-900">{v.pris}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between border-t border-ink-100 px-5 py-4">
              <span className="text-sm font-semibold text-ink-700">
                {k.fastPris ? 'Fast pris' : 'Estimert pris'}
              </span>
              <span className="text-xl font-bold text-brand-700">{k.sum}</span>
            </div>

            <div className="space-y-1 border-t border-ink-100 bg-ink-50/60 px-5 py-4 text-sm text-ink-600">
              <p>
                <span className="font-semibold text-ink-800">Navn:</span> {k.navn}
              </p>
              <p>
                <span className="font-semibold text-ink-800">Mobil:</span> {k.telefon}
              </p>
              <p>
                <span className="font-semibold text-ink-800">E-post:</span> {k.epost}
              </p>
              {k.adresse && (
                <p>
                  <span className="font-semibold text-ink-800">Adresse:</span> {k.adresse}
                </p>
              )}
              <p>
                <span className="font-semibold text-ink-800">Levering:</span> {k.levering} ·{' '}
                <span className="font-semibold text-ink-800">Betaling:</span> {k.betaling}
              </p>
              {k.kommentar && (
                <p>
                  <span className="font-semibold text-ink-800">Din melding:</span> {k.kommentar}
                </p>
              )}
            </div>

            <p className="border-t border-ink-100 px-5 py-4 text-[13px] leading-relaxed text-ink-600">
              Bekreftelsen er sendt til{' '}
              <span className="font-semibold text-ink-800">{k.epost}</span>. Har du bilde av det som
              skal fikses, eller en 3D-fil? Send det på melding når vi tar kontakt.
            </p>
          </motion.div>
        )}

        {lastet && !k && (
          <div className="mt-8 rounded-3xl border border-ink-100 bg-white p-6 text-center text-sm text-ink-600 shadow-soft">
            Vi fant ikke detaljene i denne nettleseren, men bestillingen er registrert hos oss.
            Sjekk e-posten din for bekreftelsen – eller ring oss, så finner vi den fram.
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/galleri" className="btn-ghost">
            Se flere modeller
          </Link>
          <Link href="/" className="btn-primary">
            Til forsiden
          </Link>
        </div>
      </div>
    </main>
  );
}
