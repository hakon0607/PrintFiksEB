'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';

const ORD = ['', 'Ikke fornøyd', 'Kunne vært bedre', 'Helt greit', 'Veldig bra', 'Kjempefornøyd!'];

export function AnmeldelseSkjema({
  token,
  startStjerner,
  startNavn,
  startTekst,
  publisert,
}: {
  token: string;
  startStjerner: number;
  startNavn: string;
  startTekst: string;
  publisert: boolean;
}) {
  const [stjerner, setStjerner] = useState(startStjerner);
  const [hover, setHover] = useState(0);
  const [tekst, setTekst] = useState(startTekst);
  const [navn, setNavn] = useState(startNavn);
  const [visNavn, setVisNavn] = useState(true);
  const [sender, setSender] = useState(false);
  const [feil, setFeil] = useState('');
  const [ferdig, setFerdig] = useState(false);

  if (publisert) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
        <p className="text-lg font-bold">Takk – anmeldelsen din ligger allerede på nettsiden!</p>
        <Link href="/" className="btn-primary mt-4">Se den på forsiden</Link>
      </div>
    );
  }

  if (ferdig) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-soft">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-2xl text-white">✓</div>
        <p className="mt-4 text-2xl font-bold">Tusen takk!</p>
        <p className="mx-auto mt-2 max-w-md text-ink-600">
          Vi har fått anmeldelsen din. Vil du endre noe, kan du bruke den samme lenken igjen.
        </p>
        <Link href="/galleri" className="btn-ghost mt-6">Se hva mer vi lager</Link>
      </motion.div>
    );
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!stjerner) { setFeil('Velg hvor mange stjerner du gir.'); return; }
    if (tekst.trim().length < 5) { setFeil('Skriv noen ord om hvordan det var.'); return; }
    setSender(true);
    setFeil('');
    const res = await fetch('/api/anmeldelse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, stjerner, tekst: tekst.trim(), navn: navn.trim(), visNavn }),
    }).catch(() => null);
    const svar = res ? await res.json().catch(() => ({})) : {};
    setSender(false);
    if (!res || !res.ok) { setFeil(svar.feil || 'Klarte ikke å sende. Prøv igjen om litt.'); return; }
    setFerdig(true);
  }

  const vis = hover || stjerner;

  return (
    <form onSubmit={send} className="space-y-5 rounded-3xl border border-ink-100 bg-white p-6 shadow-soft sm:p-8">
      <div>
        <p className="label">Hvor fornøyd er du?</p>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Stjerner">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={stjerner === n}
              aria-label={`${n} av 5 stjerner`}
              onClick={() => setStjerner(n)}
              onMouseEnter={() => setHover(n)}
              className="p-1 transition-transform hover:scale-110"
            >
              <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden className={n <= vis ? 'text-amber-400' : 'text-ink-200'}>
                <path fill="currentColor" d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.45 6.19 20.5 7.3 14.03 2.6 9.45l6.5-.95L12 2.6z" />
              </svg>
            </button>
          ))}
          <span className="ml-2 text-sm font-semibold text-ink-600">{ORD[vis]}</span>
        </div>
      </div>

      <label className="block">
        <span className="label">Hva synes du?</span>
        <textarea
          value={tekst}
          onChange={(e) => setTekst(e.target.value.slice(0, 600))}
          rows={4}
          placeholder="F.eks. hvordan det ble, hvor fort det gikk, eller hva du brukte det til."
          className="field resize-none"
        />
        <span className="hint">{tekst.length}/600</span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Navn som vises</span>
          <input value={navn} onChange={(e) => setNavn(e.target.value.slice(0, 40))} disabled={!visNavn} className="field disabled:opacity-50" />
        </label>
        <label className="flex items-center gap-2.5 self-end pb-3 text-sm font-semibold text-ink-700">
          <input type="checkbox" checked={visNavn} onChange={(e) => setVisNavn(e.target.checked)} className="h-5 w-5 accent-brand-600" />
          Vis navnet mitt
        </label>
      </div>

      <p className="text-xs leading-relaxed text-ink-500">
        Anmeldelsen kan bli vist på printfiks.org sammen med {visNavn ? 'navnet over' : '«Kunde»'}. Vi viser den ikke
        før vi har lest den.
      </p>

      {feil && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">{feil}</p>}

      <button type="submit" disabled={sender} className="btn-primary w-full disabled:opacity-60 sm:w-auto">
        {sender ? 'Sender …' : 'Send anmeldelsen'}
      </button>
    </form>
  );
}
