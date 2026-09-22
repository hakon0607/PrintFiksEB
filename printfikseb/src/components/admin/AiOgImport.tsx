'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAdmin } from './AdminProvider';
import { ImageListUpload } from './ImageListUpload';
import type { Product } from '@/lib/types';

type Status = { finnes: boolean; maskert?: string; oppdatert?: string; av?: string };

export function AiOgImport({ onImportert }: { onImportert?: () => void }) {
  const { supabase, profile } = useAdmin();
  const erEier = profile?.role === 'eier';

  const [apen, setApen] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [nokkel, setNokkel] = useState('');
  const [lagrer, setLagrer] = useState(false);
  const [nokkelFeil, setNokkelFeil] = useState('');
  const [nokkelOk, setNokkelOk] = useState('');

  const [lenke, setLenke] = useState('');
  const [henter, setHenter] = useState(false);
  const [importFeil, setImportFeil] = useState('');
  const [manuell, setManuell] = useState(false);
  const [navn, setNavn] = useState('');
  const [tekst, setTekst] = useState('');
  const [bilder, setBilder] = useState<string[]>([]);
  const [resultat, setResultat] = useState<{
    produkt: Product;
    antallBilder: number;
    brukteAi: boolean;
    merknad?: string;
  } | null>(null);

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

  async function lagreNokkel(e: React.FormEvent) {
    e.preventDefault();
    setLagrer(true);
    setNokkelFeil('');
    setNokkelOk('');
    const res = await fetch('/api/ai-nokkel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ key: nokkel }),
    });
    const svar = await res.json().catch(() => ({}));
    if (!res.ok) setNokkelFeil(svar.error || 'Klarte ikke å lagre nøkkelen.');
    else {
      setNokkel('');
      setNokkelOk('Nøkkelen er lagret. Nå kan alle i gruppa bruke AI-funksjonene.');
      window.setTimeout(() => setNokkelOk(''), 5000);
      hentStatus();
    }
    setLagrer(false);
  }

  async function slettNokkel() {
    if (!window.confirm('Slette API-nøkkelen? Da slutter AI-funksjonene å virke for alle.')) return;
    await fetch('/api/ai-nokkel', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${await token()}` },
    });
    hentStatus();
  }

  async function send(kropp: Record<string, unknown>) {
    setHenter(true);
    setImportFeil('');
    setResultat(null);
    const res = await fetch('/api/import-modell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify(kropp),
    });
    const svar = await res.json().catch(() => ({}));
    setHenter(false);

    if (svar?.blokkert) {
      setManuell(true);
      setImportFeil(svar.error || '');
      return;
    }
    if (!res.ok) {
      setImportFeil(svar.error || 'Klarte ikke å hente modellen.');
      return;
    }

    setResultat(svar);
    setManuell(false);
    setLenke('');
    setNavn('');
    setTekst('');
    setBilder([]);
    onImportert?.();
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-brand-200 bg-white shadow-soft">
      <button
        type="button"
        onClick={() => setApen((v) => !v)}
        className="flex w-full items-center gap-3 bg-brand-50/70 px-6 py-4 text-left transition-colors hover:bg-brand-50"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
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
          <span className="block text-base font-semibold text-ink-900">Hent modell med AI</span>
          <span className="mt-0.5 block text-sm text-ink-600">
            Lim inn en lenke fra MakerWorld, så lager AI-en produktsiden
            {status?.finnes ? '' : ' (krever AI-nøkkel)'}
          </span>
        </span>
        <motion.span animate={{ rotate: apen ? 180 : 0 }} className="shrink-0 text-brand-700">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
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
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-6 border-t border-brand-100 p-6">
              {/* ---------- AI-nøkkel ---------- */}
              <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-ink-500">
                    AI-nøkkel
                  </h3>
                  {status?.finnes && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      Lagt inn ✓
                    </span>
                  )}
                </div>

                {status?.finnes ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-semibold text-ink-800">
                        {status.maskert}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        Lagt inn{status.av ? ` av ${status.av}` : ''}. Alle i gruppa kan bruke den,
                        men ingen får se den.
                      </p>
                    </div>
                    {erEier && (
                      <button
                        type="button"
                        onClick={slettNokkel}
                        className="btn btn-sm border border-red-200 bg-white text-red-600 hover:bg-red-50"
                      >
                        Slett
                      </button>
                    )}
                  </div>
                ) : erEier ? (
                  <form onSubmit={lagreNokkel} className="mt-3">
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
                        className="btn-primary btn-sm shrink-0"
                      >
                        {lagrer ? 'Lagrer…' : 'Lagre'}
                      </button>
                    </div>
                    <p className="hint">
                      Hentes på platform.openai.com under «API keys». Lagres trygt på serveren til
                      noen sletter den.
                    </p>
                  </form>
                ) : (
                  <p className="mt-3 text-sm text-ink-600">
                    Ingen nøkkel lagt inn ennå. Bare eieren kan legge den inn.
                  </p>
                )}

                {nokkelFeil && (
                  <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
                    {nokkelFeil}
                  </p>
                )}
                {nokkelOk && (
                  <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
                    {nokkelOk}
                  </p>
                )}
              </div>

              {/* ---------- Hent fra lenke ---------- */}
              <div>
                <label className="label" htmlFor="modell-lenke">
                  Lenke til modellen
                </label>
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <input
                    id="modell-lenke"
                    value={lenke}
                    onChange={(e) => setLenke(e.target.value)}
                    placeholder="https://makerworld.com/en/models/..."
                    className="field flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => send({ url: lenke })}
                    disabled={henter || !lenke.trim()}
                    className="btn-primary shrink-0"
                  >
                    {henter && !manuell ? 'Henter…' : 'Hent modellen'}
                  </button>
                </div>
                <p className="hint">
                  Virker også for Printables og Thingiverse. Klarer vi ikke å hente siden, fyller du
                  inn selv i steget under.
                </p>
              </div>

              {henter && (
                <div className="flex items-center gap-3 rounded-2xl bg-brand-50 px-5 py-4 text-sm text-brand-800">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-300 border-t-brand-700" />
                  Jobber… Dette tar gjerne 10–30 sekunder.
                </div>
              )}

              {importFeil && (
                <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  {importFeil}
                </p>
              )}

              {/* ---------- Manuell utfylling ---------- */}
              {!manuell && (
                <button
                  type="button"
                  onClick={() => setManuell(true)}
                  className="text-sm font-semibold text-brand-700 hover:underline"
                >
                  Eller fyll inn selv og la AI skrive teksten →
                </button>
              )}

              <AnimatePresence initial={false}>
                {manuell && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-4 rounded-2xl border border-ink-200 bg-white p-5">
                      <div>
                        <h3 className="text-base font-semibold">Fyll inn selv</h3>
                        <p className="mt-1 text-sm leading-relaxed text-ink-500">
                          Åpne modellsiden i nettleseren. Kopier tittelen og teksten, og høyreklikk
                          på bildene → «Kopier bilde» → lim inn her med Ctrl+V. AI-en skriver om
                          teksten til norsk og foreslår pris.
                        </p>
                      </div>

                      <div>
                        <label className="label" htmlFor="manuelt-navn">
                          Hva heter modellen?
                        </label>
                        <input
                          id="manuelt-navn"
                          value={navn}
                          onChange={(e) => setNavn(e.target.value)}
                          placeholder="F.eks. Cable Clip Holder"
                          className="field"
                        />
                      </div>

                      <div>
                        <label className="label" htmlFor="manuell-tekst">
                          Tekst fra siden
                        </label>
                        <textarea
                          id="manuell-tekst"
                          rows={5}
                          value={tekst}
                          onChange={(e) => setTekst(e.target.value)}
                          placeholder="Lim inn beskrivelsen fra modellsiden – eller skriv noen stikkord med egne ord. AI-en fikser resten."
                          className="field resize-y"
                        />
                      </div>

                      <ImageListUpload
                        value={bilder}
                        onChange={setBilder}
                        label="Bilder"
                        help="Første bilde blir hovedbildet. Du kan lime inn med Ctrl+V."
                      />

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            send({ manuell: true, url: lenke, navn, tekst, bilder })
                          }
                          disabled={henter || (!navn.trim() && !tekst.trim())}
                          className="btn-primary"
                        >
                          {henter ? 'Lager modellen…' : 'Lag modellen med AI'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setManuell(false)}
                          className="btn-ghost"
                        >
                          Avbryt
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ---------- Resultat ---------- */}
              <AnimatePresence>
                {resultat && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50"
                  >
                    <div className="flex flex-wrap gap-4 p-5">
                      {resultat.produkt.image_url && (
                        <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-white">
                          <Image
                            src={resultat.produkt.image_url}
                            alt=""
                            fill
                            sizes="112px"
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-emerald-900">
                          «{resultat.produkt.name}» er lagt i galleriet
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-emerald-800">
                          {resultat.antallBilder} bilde{resultat.antallBilder === 1 ? '' : 'r'}.
                          Foreslått pris: {Math.round(Number(resultat.produkt.price))} kr.
                          {resultat.brukteAi ? ' AI skrev beskrivelsen.' : ''}
                        </p>
                        {resultat.merknad && (
                          <p className="mt-1 text-xs text-emerald-700">{resultat.merknad}</p>
                        )}
                        <p className="mt-2 text-xs font-semibold text-emerald-900">
                          Den er skjult. Se over teksten og prisen i listen under, og skru den på.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="rounded-2xl bg-ink-50 px-4 py-3 text-xs leading-relaxed text-ink-600">
                Husk å sjekke lisensen på modellen før dere selger den. De fleste på MakerWorld er
                gratis til privat bruk, men ikke alle kan selges videre. Egne design kan dere alltid
                selge.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
