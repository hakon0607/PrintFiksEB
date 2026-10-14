'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ProductCard, type Tetthet } from './ProductCard';
import { KategoriMeny, type KategoriValg } from './KategoriMeny';
import { HalloweenScene, JulScene, Nett, Snofall } from './TemaPynt';
import { temaFor, type Tema } from '@/lib/temaer';
import type { Product } from '@/lib/types';

const ALLE = 'alle';
const ANNET = 'annet';

type Gruppe = {
  verdi: string;
  navn: string;
  tema: Tema | null;
  sesong: boolean;
  produkter: Product[];
};

function gridKlasse(kolonner: Tetthet) {
  return `grid sm:grid-cols-2 lg:grid-cols-3 ${
    kolonner === 3
      ? 'grid-cols-3 gap-2.5 sm:gap-5'
      : kolonner === 2
        ? 'grid-cols-2 gap-3 sm:gap-5'
        : 'grid-cols-1 gap-5'
  }`;
}

export function GalleryGrid({
  products,
  currency = 'kr',
  startKategori,
  maaned,
  fremhevTema,
}: {
  products: Product[];
  currency?: string;
  /** Fra adressen, f.eks. /galleri?kategori=Jul */
  startKategori?: string;
  /** Måneden nå (1–12), regnet ut på serveren så alle ser det samme. */
  maaned: number;
  /** Tema satt som «Nyhet» i admin – kommer helt øverst. */
  fremhevTema?: string | null;
}) {
  /* ---------- Grupper modellene etter kategori ---------- */
  const grupper = useMemo<Gruppe[]>(() => {
    const kart = new Map<string, Gruppe>();
    for (const p of products) {
      const navn = (p.category ?? '').trim();
      const verdi = navn ? navn.toLowerCase() : ANNET;
      if (!kart.has(verdi)) {
        const tema = temaFor(navn);
        kart.set(verdi, {
          verdi,
          navn: navn || 'Annet',
          tema,
          sesong: Boolean(tema && tema.sesong.includes(maaned)),
          produkter: [],
        });
      }
      kart.get(verdi)!.produkter.push(p);
    }
    // Rekkefølge: tema i sesong → andre tema → vanlige (alfabetisk) → «Annet» sist
    const rang = (g: Gruppe) =>
      fremhevTema && g.tema?.id === fremhevTema ? -1 : g.sesong ? 0 : g.tema ? 1 : g.verdi === ANNET ? 3 : 2;
    return [...kart.values()].sort(
      (a, b) => rang(a) - rang(b) || a.navn.localeCompare(b.navn, 'nb')
    );
  }, [products, maaned, fremhevTema]);

  const valg: KategoriValg[] = useMemo(
    () => [
      { verdi: ALLE, navn: 'Alle kategorier', antall: products.length },
      ...grupper.map((g) => ({
        verdi: g.verdi,
        navn: g.navn,
        antall: g.produkter.length,
        tema: g.tema?.id ?? null,
        sesong: g.sesong,
      })),
    ],
    [grupper, products.length]
  );

  const [kategori, setKategori] = useState(() => {
    const s = (startKategori ?? '').trim().toLowerCase();
    return s && grupper.some((g) => g.verdi === s) ? s : ALLE;
  });
  const [sok, setSok] = useState('');

  function velgKategori(v: string) {
    setKategori(v);
    // Husk valget i adressen, så lenken kan deles («/galleri?kategori=jul»)
    try {
      const url = new URL(window.location.href);
      if (v === ALLE) url.searchParams.delete('kategori');
      else url.searchParams.set('kategori', grupper.find((g) => g.verdi === v)?.navn ?? v);
      window.history.replaceState(null, '', url.toString());
    } catch {
      /* ikke kritisk */
    }
  }

  /* ---------- Antall kort i bredden på mobil (huskes) ---------- */
  const [kolonner, setKolonner] = useState<Tetthet>(1);
  useEffect(() => {
    try {
      const lagret = Number(window.localStorage.getItem('printfikseb_kolonner'));
      if (lagret === 1 || lagret === 2 || lagret === 3) setKolonner(lagret);
    } catch {
      /* ikke kritisk */
    }
  }, []);
  function velgKolonner(n: Tetthet) {
    setKolonner(n);
    try {
      window.localStorage.setItem('printfikseb_kolonner', String(n));
    } catch {
      /* ikke kritisk */
    }
  }

  /* ---------- Søk + valgt kategori ---------- */
  const synlige = useMemo(() => {
    const q = sok.trim().toLowerCase();
    const treffer = (p: Product) =>
      !q ||
      [p.name, p.description, p.code, p.material, p.category]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    return grupper
      .filter((g) => kategori === ALLE || g.verdi === kategori)
      .map((g) => ({ ...g, produkter: g.produkter.filter(treffer) }))
      .filter((g) => g.produkter.length > 0);
  }, [grupper, kategori, sok]);

  const visOverskrifter = kategori !== ALLE || grupper.length > 1;

  return (
    <div>
      {/* ---------- Verktøylinje ---------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {grupper.length > 0 && <KategoriMeny valg={valg} verdi={kategori} onVelg={velgKategori} />}

        <div className="flex items-center gap-3">
          {/* Bare på mobil – på større skjermer er det allerede 2 og 3 i bredden */}
          <div
            className="flex shrink-0 items-center gap-1 rounded-full border border-ink-200 bg-white p-1 sm:hidden"
            role="group"
            aria-label="Hvor mange modeller ved siden av hverandre"
          >
            {([1, 2, 3] as Tetthet[]).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => velgKolonner(n)}
                aria-pressed={kolonner === n}
                aria-label={`${n} i bredden`}
                className={`grid h-9 w-9 place-items-center rounded-full transition-colors ${
                  kolonner === n ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-50'
                }`}
              >
                <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden fill="currentColor">
                  {n === 1 && <rect x="2" y="2" width="14" height="14" rx="2.5" />}
                  {n === 2 && (
                    <>
                      <rect x="2" y="2" width="6" height="14" rx="2" />
                      <rect x="10" y="2" width="6" height="14" rx="2" />
                    </>
                  )}
                  {n === 3 && (
                    <>
                      <rect x="1.5" y="2" width="4" height="14" rx="1.5" />
                      <rect x="7" y="2" width="4" height="14" rx="1.5" />
                      <rect x="12.5" y="2" width="4" height="14" rx="1.5" />
                    </>
                  )}
                </svg>
              </button>
            ))}
          </div>

          <div className="relative flex-1 sm:w-64">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400"
            >
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
              <path d="m16 16 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              value={sok}
              onChange={(e) => setSok(e.target.value)}
              placeholder="Søk etter modell eller ID"
              className="field pl-10"
              aria-label="Søk i galleriet"
            />
          </div>
        </div>
      </div>

      {/* ---------- Innholdet ---------- */}
      {synlige.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-ink-200 bg-white/70 px-6 py-16 text-center">
          <p className="text-lg font-semibold text-ink-800">Ingen modeller å vise her ennå</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
            Prøv et annet søk eller en annen kategori, eller bruk priskalkulatoren til å bestille noe
            helt eget. Vi lager det meste.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-12">
          {synlige.map((g) =>
            g.tema ? (
              <TemaSeksjon key={g.verdi} gruppe={g} tema={g.tema} kolonner={kolonner} currency={currency} />
            ) : (
              <section key={g.verdi} aria-label={g.navn}>
                {visOverskrifter && (
                  <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-ink-100 pb-3">
                    <h2 className="text-xl font-bold text-ink-900 sm:text-2xl">{g.navn}</h2>
                    <span className="text-sm font-semibold text-ink-400">
                      {g.produkter.length} {g.produkter.length === 1 ? 'modell' : 'modeller'}
                    </span>
                    {kategori === ALLE && grupper.length > 1 && (
                      <button
                        type="button"
                        onClick={() => velgKategori(g.verdi)}
                        className="ml-auto text-sm font-semibold text-brand-700 hover:underline"
                      >
                        Vis bare {g.navn.toLowerCase()}
                      </button>
                    )}
                  </div>
                )}
                <Kortrutenett produkter={g.produkter} kolonner={kolonner} currency={currency} />
              </section>
            )
          )}
        </div>
      )}
    </div>
  );
}

function Kortrutenett({
  produkter,
  kolonner,
  currency,
  tema,
}: {
  produkter: Product[];
  kolonner: Tetthet;
  currency: string;
  tema?: Tema | null;
}) {
  return (
    <motion.div layout className={gridKlasse(kolonner)}>
      <AnimatePresence mode="popLayout">
        {produkter.map((p) => (
          <motion.div
            key={p.id}
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="h-full"
          >
            <ProductCard product={p} currency={currency} tetthet={kolonner} temaId={tema?.id ?? null} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

/** Halloween og Jul får sin egen drakt: banner, farger og pynt. */
function TemaSeksjon({
  gruppe,
  tema,
  kolonner,
  currency,
}: {
  gruppe: Gruppe;
  tema: Tema;
  kolonner: Tetthet;
  currency: string;
}) {
  const n = gruppe.produkter.length;
  return (
    <section
      aria-label={gruppe.navn}
      className={`tema-seksjon relative -mx-2 overflow-hidden rounded-[2rem] sm:mx-0 ${tema.seksjon}`}
    >
      {tema.id === 'jul' && <Snofall />}
      {tema.id === 'halloween' && (
        <Nett className="pointer-events-none absolute -left-1 -top-1 h-28 w-28 sm:h-36 sm:w-36" />
      )}

      {/* Banneret */}
      <div className="relative h-80 sm:h-64">
        {tema.id === 'halloween' ? <HalloweenScene /> : <JulScene />}
        {/* mørkere bak teksten: ovenfra på mobil, fra venstre på større skjermer */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/25 to-transparent sm:bg-gradient-to-r sm:from-black/45 sm:via-black/10" />
        <div className="relative z-10 flex h-full max-w-[30rem] flex-col justify-start px-6 pt-7 sm:justify-center sm:px-9 sm:pt-0">
          <span className={`w-fit rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${tema.etikett}`}>
            {gruppe.sesong ? 'I sesong nå' : 'Sesong'} · {n} {n === 1 ? 'modell' : 'modeller'}
          </span>
          <h2 className={`mt-3 text-4xl font-bold tracking-tight sm:text-5xl ${tema.tittelFarge}`}>
            {gruppe.navn}
          </h2>
          <p className={`mt-2 max-w-sm text-[15px] leading-relaxed ${tema.tekstFarge}`}>
            {tema.undertekst}
          </p>
        </div>
      </div>

      {/* Modellene */}
      <div className="relative px-3 pb-5 pt-2 sm:px-7 sm:pb-8">
        <Kortrutenett produkter={gruppe.produkter} kolonner={kolonner} currency={currency} tema={tema} />
      </div>
    </section>
  );
}
