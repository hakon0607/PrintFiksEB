'use client';

import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAdmin } from './AdminProvider';
import { kr } from '@/lib/settings';

type Lisens = {
  navn: string;
  salg: 'ja' | 'nei' | 'ukjent';
  kreverKreditering: boolean;
  forklaring: string;
};

type Svar = {
  kilde: {
    url: string;
    nettsted: string;
    designer: string;
    kjent: boolean;
    originalTittel: string;
    bilde: string;
    vektFunnet: number | null;
  };
  lisens: Lisens;
  forslag: {
    name: string;
    tagline: string;
    description: string;
    details: string;
    highlights: string[];
    category: string;
    material: string;
    weight_g: number;
    price: number;
    cost_price: number;
  };
  regnestykke: {
    vekt: number;
    perGram: number;
    materialkost: number;
    materiale: string;
    fortjeneste: number;
  };
  aiFeil?: string;
};

const LISENSFARGE: Record<Lisens['salg'], string> = {
  ja: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  nei: 'bg-red-50 text-red-700 border-red-200',
  ukjent: 'bg-amber-50 text-amber-900 border-amber-200',
};

export function Importer({ onLagt }: { onLagt?: () => void }) {
  const { supabase } = useAdmin();

  const [apen, setApen] = useState(false);
  const [url, setUrl] = useState('');
  const [henter, setHenter] = useState(false);
  const [feil, setFeil] = useState('');
  const [svar, setSvar] = useState<Svar | null>(null);
  const [lagrer, setLagrer] = useState(false);
  const [ferdig, setFerdig] = useState('');
  const [brukBilde, setBrukBilde] = useState(true);

  const token = useCallback(async () => {
    if (!supabase) return '';
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? '';
  }, [supabase]);

  async function hent(e: React.FormEvent) {
    e.preventDefault();
    setHenter(true);
    setFeil('');
    setSvar(null);
    setFerdig('');
    const res = await fetch('/api/importer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ url }),
    });
    const data = await res.json().catch(() => ({}));
    setHenter(false);
    if (!res.ok || !data.ok) {
      setFeil(data.feil || data.error || 'Klarte ikke å hente fra den lenken.');
      return;
    }
    setSvar(data as Svar);
    setBrukBilde(Boolean(data.kilde?.bilde) && data.lisens?.salg === 'ja');
  }

  async function lagre() {
    if (!supabase || !svar) return;
    setLagrer(true);
    setFeil('');
    const f = svar.forslag;
    const { error } = await supabase.from('products').insert({
      name: f.name,
      tagline: f.tagline,
      description: f.description,
      details: f.details,
      highlights: f.highlights,
      category: f.category,
      material: f.material,
      weight_g: f.weight_g,
      price: f.price,
      cost_price: f.cost_price,
      image_url: brukBilde ? svar.kilde.bilde : '',
      source_url: svar.kilde.url,
      kilde_designer: svar.kilde.designer,
      kilde_lisens: svar.lisens.navn,
      active: false,
      sort: 100,
    });
    setLagrer(false);
    if (error) {
      setFeil(`Klarte ikke å lagre: ${error.message}`);
      return;
    }
    setFerdig(`«${f.name}» er lagt inn som skjult. Åpne den i listen under, se over og skru den på.`);
    setSvar(null);
    setUrl('');
    onLagt?.();
  }

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setApen((v) => !v)}
        className="flex w-full items-center gap-3 px-6 py-4 text-left"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink-900">Hent modell fra lenke</span>
          <span className="mt-0.5 block text-[13px] text-ink-600">
            Lim inn en lenke fra MakerWorld, Printables eller Thingiverse, så fyller vi ut navn,
            beskrivelse, vekt og pris.
          </span>
        </span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className={`shrink-0 text-ink-400 transition-transform ${apen ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
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
              <form onSubmit={hent} className="flex flex-col gap-2.5 sm:flex-row">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://makerworld.com/en/models/..."
                  className="field flex-1"
                  aria-label="Lenke til modellen"
                />
                <button type="submit" className="btn-primary shrink-0" disabled={henter || !url}>
                  {henter ? 'Henter …' : 'Hent'}
                </button>
              </form>

              {feil && (
                <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
                  {feil}
                </p>
              )}
              {ferdig && (
                <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
                  {ferdig}
                </p>
              )}

              {svar && (
                <div className="mt-5 space-y-4">
                  {/* Lisens først – det avgjør om vi i det hele tatt kan selge den */}
                  <div className={`rounded-2xl border px-4 py-3 ${LISENSFARGE[svar.lisens.salg]}`}>
                    <p className="text-sm font-bold">
                      {svar.lisens.salg === 'ja'
                        ? `Lov å selge · ${svar.lisens.navn}`
                        : svar.lisens.salg === 'nei'
                          ? `Ikke lov å selge · ${svar.lisens.navn}`
                          : 'Fant ingen lisens'}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed">{svar.lisens.forklaring}</p>
                    {svar.lisens.kreverKreditering && svar.lisens.salg !== 'nei' && (
                      <p className="mt-1.5 text-[13px] leading-relaxed">
                        Designeren{svar.kilde.designer ? ` (${svar.kilde.designer})` : ''} og lenken
                        lagres på modellen, og vises på produktsiden.
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-ink-200 bg-white p-4">
                    <div className="flex flex-wrap gap-4">
                      {svar.kilde.bilde && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={svar.kilde.bilde}
                          alt=""
                          className="h-28 w-36 shrink-0 rounded-xl object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold text-ink-900">{svar.forslag.name}</p>
                        {svar.forslag.tagline && (
                          <p className="text-[13px] text-ink-600">{svar.forslag.tagline}</p>
                        )}
                        <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
                          {svar.forslag.description}
                        </p>
                        <p className="mt-2 text-[12px] text-ink-500">
                          Fra {svar.kilde.nettsted}
                          {svar.kilde.designer ? ` · ${svar.kilde.designer}` : ''} ·{' '}
                          <span className="text-ink-400">{svar.kilde.originalTittel}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-4">
                      {[
                        ['Pris til kunden', kr(svar.forslag.price)],
                        ['Koster oss', kr(svar.forslag.cost_price)],
                        ['Vi tjener', kr(svar.regnestykke.fortjeneste)],
                        ['Vekt', `${svar.forslag.weight_g} g`],
                      ].map(([merke, verdi]) => (
                        <div key={merke} className="rounded-xl bg-ink-50 px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                            {merke}
                          </p>
                          <p className="text-sm font-bold text-ink-900">{verdi}</p>
                        </div>
                      ))}
                    </div>

                    <p className="mt-2 text-[12px] leading-relaxed text-ink-500">
                      {svar.regnestykke.vekt} g × {svar.regnestykke.perGram} kr/g (
                      {svar.regnestykke.materiale}) = {kr(svar.regnestykke.materialkost)} i
                      materiale.{' '}
                      {svar.kilde.vektFunnet
                        ? 'Vekten stod på siden.'
                        : 'Vekten stod ikke på siden, så den er anslått – sjekk den i sliceren.'}
                    </p>

                    {svar.aiFeil && (
                      <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-900">
                        {svar.aiFeil}
                      </p>
                    )}
                  </div>

                  {svar.kilde.bilde && (
                    <label className="flex items-start gap-2.5 text-sm font-semibold text-ink-700">
                      <input
                        type="checkbox"
                        checked={brukBilde}
                        onChange={(e) => setBrukBilde(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600"
                      />
                      <span>
                        Bruk bildet fra siden inntil videre
                        <span className="block text-xs font-normal text-ink-500">
                          Bildet tilhører designeren. Bytt det til et bilde av deres egen print så
                          fort dere har printet den.
                        </span>
                      </span>
                    </label>
                  )}

                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={lagre}
                      className="btn-primary"
                      disabled={lagrer || svar.lisens.salg === 'nei'}
                    >
                      {lagrer ? 'Lagrer …' : 'Legg inn i galleriet'}
                    </button>
                    <button type="button" onClick={() => setSvar(null)} className="btn-ghost">
                      Forkast
                    </button>
                  </div>

                  {svar.lisens.salg === 'nei' && (
                    <p className="text-[13px] leading-relaxed text-red-700">
                      Denne kan dere ikke legge ut for salg. Finn en tilsvarende modell med CC0,
                      CC BY eller CC BY-SA i stedet.
                    </p>
                  )}
                  <p className="text-[12px] leading-relaxed text-ink-500">
                    Modellen legges inn som skjult. Se over teksten, bytt bilde og skru den på når
                    dere er fornøyde.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
