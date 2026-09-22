'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAdmin } from './AdminProvider';
import type { Product } from '@/lib/types';

type Status = { finnes: boolean; maskert?: string; oppdatert?: string; av?: string };

export function AiOgImport() {
  const { supabase, profile } = useAdmin();
  const erEier = profile?.role === 'eier';

  const [status, setStatus] = useState<Status | null>(null);
  const [nokkel, setNokkel] = useState('');
  const [lagrer, setLagrer] = useState(false);
  const [nokkelFeil, setNokkelFeil] = useState('');
  const [nokkelOk, setNokkelOk] = useState('');

  const [lenke, setLenke] = useState('');
  const [henter, setHenter] = useState(false);
  const [importFeil, setImportFeil] = useState('');
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
    if (!res.ok) {
      setNokkelFeil(svar.error || 'Klarte ikke å lagre nøkkelen.');
    } else {
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

  async function importer(e: React.FormEvent) {
    e.preventDefault();
    setHenter(true);
    setImportFeil('');
    setResultat(null);
    const res = await fetch('/api/import-modell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ url: lenke }),
    });
    const svar = await res.json().catch(() => ({}));
    if (!res.ok) {
      setImportFeil(svar.error || 'Klarte ikke å hente modellen.');
    } else {
      setResultat(svar);
      setLenke('');
    }
    setHenter(false);
  }

  return (
    <div className="space-y-5">
      {/* ---------- API-nøkkel ---------- */}
      <section className="rounded-3xl border border-ink-100 bg-white p-6 shadow-soft sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">AI-nøkkel</h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-500">
              Nøkkelen lar nettsiden skrive beskrivelser automatisk. Den legges inn én gang, og
              ligger trygt på serveren til noen sletter den. Alle i gruppa kan bruke funksjonene –
              men ingen får se selve nøkkelen igjen.
            </p>
          </div>
          {status?.finnes && (
            <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
              Lagt inn ✓
            </span>
          )}
        </div>

        {status?.finnes ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-ink-50 px-5 py-4">
            <div>
              <p className="font-mono text-sm font-semibold text-ink-800">{status.maskert}</p>
              <p className="mt-0.5 text-xs text-ink-500">
                Lagt inn{status.av ? ` av ${status.av}` : ''}
                {status.oppdatert
                  ? ` ${new Date(status.oppdatert).toLocaleDateString('nb-NO')}`
                  : ''}
              </p>
            </div>
            {erEier && (
              <button
                type="button"
                onClick={slettNokkel}
                className="btn btn-sm border border-red-200 bg-white text-red-600 hover:bg-red-50"
              >
                Slett nøkkelen
              </button>
            )}
          </div>
        ) : erEier ? (
          <form onSubmit={lagreNokkel} className="mt-5">
            <label className="label" htmlFor="apinokkel">
              Lim inn OpenAI-nøkkelen
            </label>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <input
                id="apinokkel"
                type="password"
                value={nokkel}
                onChange={(e) => setNokkel(e.target.value)}
                placeholder="sk-..."
                className="field flex-1 font-mono"
                autoComplete="off"
              />
              <button type="submit" disabled={lagrer || !nokkel.trim()} className="btn-primary shrink-0">
                {lagrer ? 'Lagrer…' : 'Lagre nøkkelen'}
              </button>
            </div>
            <p className="hint">
              Du finner den på platform.openai.com under «API keys». Del den aldri med noen utenfor
              bedriften.
            </p>
          </form>
        ) : (
          <p className="mt-5 rounded-2xl bg-ink-50 px-5 py-4 text-sm text-ink-600">
            Ingen nøkkel er lagt inn ennå. Bare eieren av siden kan legge den inn.
          </p>
        )}

        {nokkelFeil && (
          <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {nokkelFeil}
          </p>
        )}
        {nokkelOk && (
          <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {nokkelOk}
          </p>
        )}
      </section>

      {/* ---------- Import ---------- */}
      <section className="rounded-3xl border border-brand-200 bg-white p-6 shadow-soft sm:p-7">
        <h2 className="text-lg font-semibold">Hent modell fra en lenke</h2>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-500">
          Lim inn lenken til en modell på MakerWorld, Printables eller Thingiverse. Vi henter bilder
          og informasjon, lar AI skrive en norsk beskrivelse, og legger modellen i galleriet – skjult
          til dere har sett over den.
        </p>

        <form onSubmit={importer} className="mt-5">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <input
              value={lenke}
              onChange={(e) => setLenke(e.target.value)}
              placeholder="https://makerworld.com/en/models/..."
              className="field flex-1"
              aria-label="Lenke til modellen"
            />
            <button type="submit" disabled={henter || !lenke.trim()} className="btn-primary shrink-0">
              {henter ? 'Henter…' : 'Hent modellen'}
            </button>
          </div>
        </form>

        {henter && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-brand-50 px-5 py-4 text-sm text-brand-800">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-300 border-t-brand-700" />
            Henter siden, laster ned bilder og skriver tekst. Dette tar gjerne 10–30 sekunder.
          </div>
        )}

        {importFeil && (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {importFeil}
          </p>
        )}

        <AnimatePresence>
          {resultat && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-5 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50"
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
                    {resultat.antallBilder} bilde{resultat.antallBilder === 1 ? '' : 'r'} hentet.
                    Foreslått pris: {Math.round(Number(resultat.produkt.price))} kr.{' '}
                    {resultat.brukteAi ? 'AI skrev beskrivelsen.' : ''}
                  </p>
                  {resultat.merknad && (
                    <p className="mt-1 text-xs text-emerald-700">{resultat.merknad}</p>
                  )}
                  <p className="mt-2 text-xs font-semibold text-emerald-900">
                    Modellen er skjult. Gå til Galleri, se over teksten og prisen, og skru den på.
                  </p>
                  <Link href="/admin/galleri" className="btn-dark btn-sm mt-3">
                    Åpne galleriet
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-5 rounded-2xl bg-ink-50 px-4 py-3 text-xs leading-relaxed text-ink-600">
          Husk å sjekke lisensen på modellen før dere selger den. De fleste på MakerWorld er gratis
          til privat bruk, men ikke alle kan selges videre. Egne design kan dere alltid selge.
        </p>
      </section>
    </div>
  );
}
