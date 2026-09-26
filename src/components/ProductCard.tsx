'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '@/lib/cart';
import { kr } from '@/lib/settings';
import type { Product } from '@/lib/types';

/** 1 = vanlig kort, 2 = smalere, 3 = smalest. Styrer hvor mye som vises. */
export type Tetthet = 1 | 2 | 3;

export function ProductCard({
  product,
  currency = 'kr',
  tetthet = 1,
}: {
  product: Product;
  currency?: string;
  tetthet?: Tetthet;
}) {
  const { add } = useCart();
  const [lagtTil, setLagtTil] = useState(false);
  const smal = tetthet >= 2;
  const smalest = tetthet === 3;

  function leggTil() {
    add({
      kind: 'product',
      qty: 1,
      title: product.name,
      productId: product.id,
      code: product.code || '',
      price: Number(product.price) || 0,
      imageUrl: product.image_url || undefined,
    });
    setLagtTil(true);
    window.setTimeout(() => setLagtTil(false), 1800);
  }

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className={`group flex h-full flex-col overflow-hidden border border-ink-100 bg-white shadow-soft transition-shadow hover:shadow-lift ${
        smalest ? 'rounded-2xl' : 'rounded-3xl'
      }`}
    >
      <Link
        href={product.code ? `/galleri/${product.code}` : '/galleri'}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-brand-50 to-brand-100"
        aria-label={product.name}
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes={smalest ? '33vw' : smal ? '50vw' : '(max-width: 768px) 100vw, 33vw'}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-brand-300">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 2.8 20 7v10l-8 4.2L4 17V7z M12 2.8 12 12m0 0 8-5m-8 5-8-5m8 5v9.2"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
        {product.code && (
          <span
            className={`absolute bg-ink-900/85 font-bold text-white backdrop-blur ${
              smalest
                ? 'left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[9px] sm:left-3 sm:top-3 sm:rounded-full sm:px-2.5 sm:py-1 sm:text-[11px]'
                : 'left-3 top-3 rounded-full px-2.5 py-1 text-[11px]'
            }`}
          >
            <span className={smalest ? 'sm:hidden' : 'hidden'}>{product.code}</span>
            <span className={smalest ? 'hidden sm:inline' : ''}>ID {product.code}</span>
          </span>
        )}
        {product.featured && (
          <span
            className={`absolute right-3 top-3 rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-bold text-white ${
              smalest ? 'hidden sm:inline-block' : ''
            }`}
          >
            Populær
          </span>
        )}
        {(product.images?.length ?? 0) > 0 && (
          <span
            className={`absolute bottom-3 right-3 items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink-600 backdrop-blur ${
              smalest ? 'hidden sm:inline-flex' : 'inline-flex'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="3" y="5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M8 3h11a2 2 0 0 1 2 2v11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {(product.images?.length ?? 0) + 1}
          </span>
        )}
      </Link>

      <div
        className={`flex flex-1 flex-col ${
          smalest ? 'p-2.5 sm:p-5' : smal ? 'p-3.5 sm:p-5' : 'p-5'
        }`}
      >
        <div
          className={`flex ${
            smal
              ? 'flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3'
              : 'items-start justify-between gap-3'
          }`}
        >
          <h3
            className={`min-w-0 font-semibold leading-snug text-ink-900 ${
              smalest
                ? 'line-clamp-2 text-[12px] leading-tight sm:line-clamp-none sm:text-base sm:leading-snug'
                : smal
                  ? 'line-clamp-2 text-[14px] leading-tight sm:line-clamp-none sm:text-base sm:leading-snug'
                  : 'text-base'
            }`}
          >
            <Link
              href={product.code ? `/galleri/${product.code}` : '/galleri'}
              className="transition-colors hover:text-brand-700"
            >
              {product.name}
            </Link>
          </h3>
          <span
            className={`shrink-0 whitespace-nowrap font-bold text-brand-700 ${
              smal
                ? 'text-[13px] sm:rounded-full sm:bg-brand-50 sm:px-2.5 sm:py-1 sm:text-sm'
                : 'rounded-full bg-brand-50 px-2.5 py-1 text-sm'
            }`}
          >
            {kr(Number(product.price) || 0, currency)}
          </span>
        </div>

        {product.description && (
          <p
            className={`mt-2 line-clamp-3 text-sm leading-relaxed text-ink-500 ${
              smal ? 'hidden sm:block' : ''
            }`}
          >
            {product.description}
          </p>
        )}

        <div
          className={`mt-3 flex-wrap gap-1.5 text-[11px] font-semibold text-ink-500 ${
            smal ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {product.material && (
            <span className="rounded-full bg-ink-50 px-2 py-1">{product.material}</span>
          )}
          {product.weight_g ? (
            <span className="rounded-full bg-ink-50 px-2 py-1">{product.weight_g} g</span>
          ) : null}
          {product.category && (
            <span className="rounded-full bg-ink-50 px-2 py-1">{product.category}</span>
          )}
        </div>

        <div className={`mt-auto flex gap-2 ${smal ? 'pt-3 sm:pt-5' : 'pt-5'}`}>
          <Link
            href={product.code ? `/galleri/${product.code}` : '/galleri'}
            className={`btn-ghost flex-1 whitespace-nowrap ${smal ? 'hidden sm:inline-flex' : ''} ${
              smal ? '!px-3.5 !py-2 !text-[13px] sm:!px-5 sm:!py-3 sm:!text-sm' : ''
            }`}
          >
            Se mer
          </Link>
          <button
            type="button"
            onClick={leggTil}
            className={`flex-1 whitespace-nowrap ${lagtTil ? 'btn-dark' : 'btn-primary'} ${
              smal ? '!px-3.5 !py-2 !text-[13px] sm:!px-5 sm:!py-3 sm:!text-sm' : ''
            }`}
          >
            {lagtTil ? 'Lagt til ✓' : 'Legg til'}
          </button>
        </div>
      </div>
    </motion.article>
  );
}
