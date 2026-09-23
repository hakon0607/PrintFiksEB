'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '@/lib/cart';
import { kr } from '@/lib/settings';
import type { Product } from '@/lib/types';

export function ProductDetail({
  product,
  currency = 'kr',
  daysMin,
  daysMax,
}: {
  product: Product;
  currency?: string;
  daysMin: number;
  daysMax: number;
}) {
  const { add } = useCart();
  const bilder = [product.image_url, ...(product.images ?? [])].filter(Boolean) as string[];
  const [valgt, setValgt] = useState(0);
  const [antall, setAntall] = useState(1);
  const [lagtTil, setLagtTil] = useState(false);

  function leggTil() {
    add({
      kind: 'product',
      qty: antall,
      title: product.name,
      productId: product.id,
      code: product.code || '',
      price: Number(product.price) || 0,
      imageUrl: product.image_url || undefined,
    });
    setLagtTil(true);
    window.setTimeout(() => setLagtTil(false), 2600);
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
      {/* Bilder */}
      <div>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-ink-100 bg-gradient-to-br from-brand-50 to-brand-100">
          <AnimatePresence mode="wait">
            {bilder.length > 0 ? (
              <motion.div
                key={valgt}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28 }}
                className="absolute inset-0"
              >
                <Image
                  src={bilder[valgt]}
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

          {product.code && (
            <span className="absolute left-4 top-4 rounded-full bg-ink-900/85 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
              ID {product.code}
            </span>
          )}
        </div>

        {bilder.length > 1 && (
          <div className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto pb-1">
            {bilder.map((b, i) => (
              <button
                key={b + i}
                type="button"
                onClick={() => setValgt(i)}
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
        <h1 className="text-balance text-3xl font-bold sm:text-4xl">{product.name}</h1>

        {product.tagline && (
          <p className="mt-2 text-balance text-lg leading-snug text-ink-500">{product.tagline}</p>
        )}

        <p className="mt-4 text-3xl font-bold text-brand-700">
          {kr(Number(product.price) || 0, currency)}
        </p>
        <p className="mt-1 text-sm text-ink-500">
          Ferdig pris – ingen startpris kommer i tillegg på modeller fra galleriet.
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
          {product.weight_g ? <Spec navn="Vekt" verdi={`${product.weight_g} g`} /> : null}
          {product.category && <Spec navn="Kategori" verdi={product.category} />}
          <Spec navn="Levering" verdi={`${daysMin}–${daysMax} virkedager`} />
        </dl>

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

        <p className="mt-5 text-sm leading-relaxed text-ink-500">
          Vil du ha den i en annen farge eller størrelse? Skriv det i kommentaren når du bestiller,
          så ordner vi det.
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
