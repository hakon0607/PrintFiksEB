'use client';

import { DesignMerke } from './DesignMerke';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '@/lib/cart';
import { kr } from '@/lib/settings';
import type { Product } from '@/lib/types';
import { versjonerFor } from '@/lib/versjoner';
import dynamic from 'next/dynamic';

const Produkt3D = dynamic(() => import('./Produkt3D').then((m) => m.Produkt3D), { ssr: false });

export function ProductDetail({
  product,
  currency = 'kr',
  daysMin,
  daysMax,
  design,
}: {
  product: Product;
  currency?: string;
  daysMin: number;
  daysMax: number;
  /** Produkter kunden designer selv (dekselet): knapp til editoren i stedet for «Legg i bestillingen». */
  design?: { href: string; knapp: string; prisNotis: string; info: string; demo?: string };
}) {
  const { add } = useCart();
  const versjoner = useMemo(() => versjonerFor(product), [product]);
  const [versjonId, setVersjonId] = useState(versjoner[0]?.id ?? '');
  const versjon = versjoner.find((v) => v.id === versjonId) ?? null;

  // Versjonens egne bilder kommer først, så modellens felles bilder
  const felles = [product.image_url, ...(product.images ?? [])].filter(Boolean) as string[];
  const bilder = versjon && versjon.bilder.length > 0
    ? [...versjon.bilder, ...felles.filter((b) => !versjon.bilder.includes(b))]
    : felles;
  const [valgt, setValgt] = useState(0);
  const har3d = Boolean(product.vis_3d && product.modell_3d);
  const [vis3d, setVis3d] = useState(false);
  const bildeRef = useRef<HTMLDivElement>(null);
  /** Åpner 3D – på mobil rulles bildet inn i synet først. */
  function apne3d() {
    setVis3d(true);
    const el = bildeRef.current;
    if (el && el.getBoundingClientRect().top < 60) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else if (el && el.getBoundingClientRect().bottom > window.innerHeight) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  const [antall, setAntall] = useState(1);
  const [lagtTil, setLagtTil] = useState(false);

  const pris = versjon ? versjon.pris : Number(product.price) || 0;
  const vekt = versjon?.vekt_g ?? product.weight_g;

  function velgVersjon(id: string) {
    setVersjonId(id);
    setValgt(0);
    setVis3d(false);
  }

  function leggTil() {
    add({
      kind: 'product',
      qty: antall,
      title: versjon ? `${product.name} – ${versjon.navn}` : product.name,
      productId: product.id,
      code: product.code || '',
      price: pris,
      imageUrl: (versjon?.bilder[0] || product.image_url) || undefined,
      variantId: versjon?.id,
      variantName: versjon?.navn,
    });
    setLagtTil(true);
    window.setTimeout(() => setLagtTil(false), 2600);
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
      {/* Bilder */}
      <div>
        <div ref={bildeRef} style={{ scrollMarginTop: 90 }} className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-ink-100 bg-gradient-to-br from-brand-50 to-brand-100">
          <AnimatePresence mode="wait">
            {vis3d && har3d ? (
              <motion.div key="3d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="absolute inset-0">
                <Produkt3D url={product.modell_3d!} farge={product.modell_3d_farge} navn={product.name} />
              </motion.div>
            ) : bilder.length > 0 ? (
              <motion.div
                key={`${versjonId}-${valgt}`}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28 }}
                className="absolute inset-0"
              >
                <Image
                  src={bilder[Math.min(valgt, bilder.length - 1)]}
                  alt={product.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className="object-cover"
                  priority
                />
              </motion.div>
            ) : (
              <div className="flex h-full items-center justify-center text-brand-300">
                <svg width="72" height="72" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 2.8 20 7v10l-8 4.2L4 17V7z M12 12l8-5m-8 5-8-5m8 5v9.2"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </AnimatePresence>

          {product.code && !design && !vis3d && (
            <span className="absolute left-4 top-4 rounded-full bg-ink-900/85 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
              ID {product.code}
            </span>
          )}

          {har3d && !vis3d && (
            <button
              type="button"
              onClick={apne3d}
              className="absolute bottom-4 left-1/2 z-[2] inline-flex -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 px-6 py-3 text-base font-extrabold text-white shadow-[0_12px_32px_-8px_rgba(37,89,199,.9)] ring-4 ring-white transition hover:scale-105 sm:px-7 sm:py-3.5 sm:text-lg"
            >
              <span className="pointer-events-none absolute -inset-2 -z-10 animate-pulse rounded-full bg-brand-500/30 blur-md" aria-hidden />
              <Terning stor />
              Se i 3D
            </button>
          )}
        </div>

        {har3d && (
          <button
            type="button"
            onClick={() => (vis3d ? setVis3d(false) : apne3d())}
            className={`mt-3 flex w-full items-center justify-center gap-2.5 rounded-2xl px-5 py-4 text-lg font-extrabold transition ${
              vis3d
                ? 'border border-ink-200 bg-white text-ink-700 hover:bg-ink-50'
                : 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-[0_14px_34px_-12px_rgba(37,89,199,.75)] hover:brightness-110'
            }`}
          >
            {vis3d ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
                Tilbake til bildene
              </>
            ) : (
              <>
                <Terning stor />
                Se modellen i 3D
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">snu og zoom</span>
              </>
            )}
          </button>
        )}

        {bilder.length > 1 && (
          <div className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto pb-1">
            {bilder.map((b, i) => (
              <button
                key={b + i}
                type="button"
                onClick={() => { setValgt(i); setVis3d(false); }}
                className={`relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl border-2 transition-all ${
                  i === valgt
                    ? 'border-brand-500 ring-4 ring-brand-100'
                    : 'border-ink-100 opacity-70 hover:opacity-100'
                }`}
                aria-label={`Bilde ${i + 1}`}
              >
                <Image src={b} alt="" fill sizes="96px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="lg:sticky lg:top-24">
        {product.design_din_egen && <DesignMerke className="mb-3" />}
        <h1 className="text-balance text-3xl font-bold sm:text-4xl">{product.name}</h1>

        {product.tagline && (
          <p className="mt-2 text-balance text-lg leading-snug text-ink-500">{product.tagline}</p>
        )}

        {har3d && !vis3d && (
          <button
            type="button"
            onClick={apne3d}
            className="group mt-5 hidden w-full items-center gap-4 rounded-2xl border-2 border-brand-200 lg:flex bg-gradient-to-r from-brand-50 to-indigo-50 p-4 text-left transition hover:border-brand-400 hover:shadow-lift"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-indigo-600 text-white shadow-[0_8px_20px_-8px_rgba(37,89,199,.9)] transition group-hover:scale-110">
              <Terning stor />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-extrabold text-ink-900">Se modellen i 3D</span>
              <span className="block text-sm text-ink-500">Snu og zoom på den før du bestiller</span>
            </span>
            <span className="shrink-0 rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white transition group-hover:bg-brand-700">Åpne 3D</span>
          </button>
        )}

        {versjoner.length > 0 && (
          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">
              Velg versjon
            </p>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Versjon">
              {versjoner.map((v) => {
                const aktiv = v.id === versjonId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="radio"
                    aria-checked={aktiv}
                    onClick={() => velgVersjon(v.id)}
                    className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm transition-all ${
                      aktiv
                        ? 'border-brand-500 bg-brand-50 font-bold text-brand-800 ring-4 ring-brand-100'
                        : 'border-ink-200 bg-white font-semibold text-ink-700 hover:border-brand-300'
                    }`}
                  >
                    {v.bilder[0] && (
                      <span className="relative h-7 w-7 overflow-hidden rounded-lg border border-ink-100">
                        <Image src={v.bilder[0]} alt="" fill sizes="28px" className="object-cover" />
                      </span>
                    )}
                    <span>{v.navn}</span>
                    <span className={aktiv ? 'text-brand-700' : 'text-ink-400'}>{kr(v.pris, currency)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <p className="mt-4 text-3xl font-bold text-brand-700">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={pris}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="inline-block"
            >
              {design ? `fra ${kr(pris, currency)}` : kr(pris, currency)}
            </motion.span>
          </AnimatePresence>
        </p>
        <p className="mt-1 text-sm text-ink-500">
          {design ? design.prisNotis : 'Ferdig pris – ingen startpris kommer i tillegg på modeller fra galleriet.'}
        </p>

        {product.description && (
          <p className="mt-6 text-[15px] leading-relaxed text-ink-700">{product.description}</p>
        )}

        {product.details && (
          <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink-600">
            {product.details
              .split(/\n{2,}/)
              .filter((a) => a.trim())
              .map((avsnitt, i) => (
                <p key={i}>{avsnitt.trim()}</p>
              ))}
          </div>
        )}

        {(product.highlights?.length ?? 0) > 0 && (
          <ul className="mt-6 space-y-2.5">
            {product.highlights!.map((h, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[15px] text-ink-700">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="m5 13 4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {h}
              </li>
            ))}
          </ul>
        )}

        <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
          {product.material && <Spec navn="Materiale" verdi={product.material} />}
          {vekt ? <Spec navn="Vekt" verdi={`${vekt} g`} /> : null}
          {product.category && <Spec navn="Kategori" verdi={product.category} />}
          <Spec navn="Levering" verdi={`${daysMin}–${daysMax} virkedager`} />
        </dl>

        {design ? (
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href={design.href} className="btn-primary px-7 py-3.5 text-base">
              {design.knapp}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M5 12h14m0 0-5.5-5.5M19 12l-5.5 5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link href="/bestill" className="btn-ghost">
              Gå til bestilling
            </Link>
          </div>
        ) : (
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setAntall((a) => Math.max(1, a - 1))}
              className="h-9 w-9 rounded-full text-lg font-bold text-ink-600 transition-colors hover:bg-ink-50"
              aria-label="Færre"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-bold">{antall}</span>
            <button
              type="button"
              onClick={() => setAntall((a) => Math.min(99, a + 1))}
              className="h-9 w-9 rounded-full text-lg font-bold text-ink-600 transition-colors hover:bg-ink-50"
              aria-label="Flere"
            >
              +
            </button>
          </div>

          <button type="button" onClick={leggTil} className={lagtTil ? 'btn-dark' : 'btn-primary'}>
            {lagtTil ? 'Lagt til ✓' : 'Legg i bestillingen'}
          </button>

          <Link href="/bestill" className="btn-ghost">
            Gå til bestilling
          </Link>
        </div>
        )}

        {design?.demo && (
          <div className="mt-5 flex gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
            <span className="mt-0.5 h-fit shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Demo</span>
            <p>{design.demo}</p>
          </div>
        )}

        <p className="mt-5 text-sm leading-relaxed text-ink-500">
          {design ? design.info : versjoner.length > 0
            ? 'Vil du ha den i en annen farge? Skriv det i kommentaren når du bestiller, så ordner vi det.'
            : 'Vil du ha den i en annen farge eller størrelse? Skriv det i kommentaren når du bestiller, så ordner vi det.'}
        </p>
      </div>
    </div>
  );
}

function Spec({ navn, verdi }: { navn: string; verdi: string }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white px-4 py-3">
      <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-400">{navn}</dt>
      <dd className="mt-0.5 font-semibold text-ink-900">{verdi}</dd>
    </div>
  );
}

/** Terning-ikon for «Se i 3D». */
function Terning({ stor }: { stor?: boolean }) {
  const st = stor ? 20 : 16;
  return (
    <svg width={st} height={st} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2.8 20 7v10l-8 4.2L4 17V7z M12 12l8-5m-8 5-8-5m8 5v9.2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
