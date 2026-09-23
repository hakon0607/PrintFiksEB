'use client';

import Image from 'next/image';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '@/lib/cart';
import { kr } from '@/lib/settings';
import type { Product } from '@/lib/types';

export function ProductCard({ product, currency = 'kr' }: { product: Product; currency?: string }) {
  const { add } = useCart();
  const [lagtTil, setLagtTil] = useState(false);

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
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-soft transition-shadow hover:shadow-lift"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-brand-50 to-brand-100">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
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
          <span className="absolute left-3 top-3 rounded-full bg-ink-900/85 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
            ID {product.code}
          </span>
        )}
        {product.featured && (
          <span className="absolute right-3 top-3 rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-bold text-white">
            Populær
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold leading-snug text-ink-900">{product.name}</h3>
          <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-sm font-bold text-brand-700">
            {kr(Number(product.price) || 0, currency)}
          </span>
        </div>

        {product.description && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-500">
            {product.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold text-ink-500">
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

        <button
          type="button"
          onClick={leggTil}
          className={`mt-5 w-full ${lagtTil ? 'btn-dark' : 'btn-primary'}`}
        >
          {lagtTil ? 'Lagt i handlelisten ✓' : 'Legg i handleliste'}
        </button>
      </div>
    </motion.article>
  );
}
