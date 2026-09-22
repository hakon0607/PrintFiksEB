'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from './AnimatedNumber';
import { formatPhone, telHref } from '@/lib/settings';
import type { Material, WeightRange } from '@/lib/types';

type Props = {
  materials: Material[];
  weightRanges: WeightRange[];
  startFee: number;
  useStartFee: boolean;
  currency: string;
  phone: string;
  designPrice: number;
  deliveryPrice: number;
  radiusKm: number;
  phoneHours: string;
};

/**
 * Rask «ca. pris»-kalkulator. Med vilje enkel: bare materiale og størrelse.
 * Alt det detaljerte (antall, tillegg, egen beskrivelse) gjøres på /bestill.
 */
export function SimpleCalculator({
  materials,
  weightRanges,
  startFee,
  useStartFee,
  currency,
  phone,
  designPrice,
  deliveryPrice,
  radiusKm,
  phoneHours,
}: Props) {
  const [materialId, setMaterialId] = useState(materials[0]?.id ?? '');
  const [rangeId, setRangeId] = useState(weightRanges[1]?.id ?? weightRanges[0]?.id ?? '');

  const material = materials.find((m) => m.id === materialId) ?? materials[0];
  const range = weightRanges.find((w) => w.id === rangeId) ?? weightRanges[0];

  const { min, maks, materialMin, materialMaks, start } = useMemo(() => {
    const perGram = material?.price_per_gram ?? 0;
    const mMin = (range?.min_g ?? 0) * perGram;
    const mMaks = (range?.max_g ?? 0) * perGram;
    const s = useStartFee ? startFee : 0;
    return { min: mMin + s, maks: mMaks + s, materialMin: mMin, materialMaks: mMaks, start: s };
  }, [material, range, startFee, useStartFee]);

  const erIntervall = Math.round(min) !== Math.round(maks);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-start">
      {/* Valg */}
      <div className="space-y-5">
        <section className="card p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              1
            </span>
            <h2 className="text-base font-semibold">Hvilket materiale?</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {materials.map((m) => {
              const valgt = m.id === materialId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMaterialId(m.id)}
                  className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
                    valgt
                      ? 'border-brand-500 bg-brand-50 ring-4 ring-brand-100'
                      : 'border-ink-200 bg-white hover:border-brand-300 hover:bg-brand-50/40'
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="font-semibold text-ink-900">{m.name}</span>
                    <span className="text-sm font-bold text-brand-700">
                      {m.price_per_gram.toLocaleString('nb-NO', { minimumFractionDigits: 2 })}{' '}
                      {currency}/g
                    </span>
                  </span>
                  <span className="mt-1.5 block text-xs leading-relaxed text-ink-500">
                    {m.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              2
            </span>
            <h2 className="text-base font-semibold">Omtrent hvor stor?</h2>
          </div>
          <p className="mt-2 text-sm text-ink-500">
            Vet du ikke vekten? Bare velg det som ligner mest – vi gir deg en nøyaktig pris etterpå.
          </p>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {weightRanges.map((w) => {
              const valgt = w.id === rangeId;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setRangeId(w.id)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition-all duration-200 ${
                    valgt
                      ? 'border-brand-500 bg-brand-50 ring-4 ring-brand-100'
                      : 'border-ink-200 bg-white hover:border-brand-300'
                  }`}
                >
                  <span className="font-semibold text-ink-900">{w.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Resultat */}
      <div className="lg:sticky lg:top-24">
        <motion.div
          layout
          className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-lift"
        >
          <div className="relative overflow-hidden bg-ink-900 px-6 py-8 text-white">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(24rem 12rem at 15% 0%, rgba(61,118,241,0.45), transparent 62%)',
              }}
            />
            <div className="relative">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-300">
                Dette koster det ca.
              </p>
              <p className="mt-2 text-[2.75rem] font-bold leading-none">
                {erIntervall ? (
                  <>
                    <AnimatedNumber value={min} />
                    <span className="mx-1 text-ink-400">–</span>
                    <AnimatedNumber value={maks} />
                  </>
                ) : (
                  <AnimatedNumber value={min} />
                )}
                <span className="ml-1.5 text-lg font-semibold text-ink-300">{currency}</span>
              </p>
              <p className="mt-2 text-xs leading-relaxed text-ink-400">
                {material?.name} · {range?.label}
              </p>
            </div>
          </div>

          <dl className="divide-y divide-ink-100 px-6 py-4 text-sm">
            <Rad
              navn="Materiale"
              verdi={
                Math.round(materialMin) === Math.round(materialMaks)
                  ? `${Math.round(materialMin)} ${currency}`
                  : `${Math.round(materialMin)}–${Math.round(materialMaks)} ${currency}`
              }
            />
            {start > 0 && <Rad navn="Startpris" verdi={`${Math.round(start)} ${currency}`} />}
          </dl>

          <div className="border-t border-ink-100 bg-ink-50/60 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-400">
              Kommer i tillegg hvis du trenger det
            </p>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li className="flex items-baseline justify-between gap-3">
                <span>Vi designer 3D-filen for deg</span>
                <span className="font-semibold text-ink-900">+{Math.round(designPrice)} {currency}</span>
              </li>
              <li className="flex items-baseline justify-between gap-3">
                <span>Hjemlevering (innen {radiusKm} km)</span>
                <span className="font-semibold text-ink-900">+{Math.round(deliveryPrice)} {currency}</span>
              </li>
              <li className="flex items-baseline justify-between gap-3">
                <span>Henting hos oss</span>
                <span className="font-semibold text-emerald-600">Gratis</span>
              </li>
            </ul>
          </div>

          <div className="border-t border-ink-100 p-6">
            <Link
              href={`/bestill?m=${encodeURIComponent(materialId)}&w=${encodeURIComponent(rangeId)}`}
              className="btn-primary w-full"
            >
              Bestill dette
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M5 12h14m0 0-5.5-5.5M19 12l-5.5 5.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <a href={telHref(phone)} className="btn-ghost mt-3 w-full">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6.5 3.5h3l1.5 4-2 1.4a12 12 0 0 0 6.1 6.1l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
              </svg>
              Ring oss på {formatPhone(phone)}
            </a>
            {phoneHours && (
              <p className="mt-2 text-center text-xs text-ink-400">{phoneHours}</p>
            )}
            <p className="mt-3 text-center text-xs leading-relaxed text-ink-500">
              Prisen er et estimat. Du får endelig pris før vi starter, og kan si nei uten at det
              koster noe.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Rad({ navn, verdi }: { navn: string; verdi: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-ink-600">{navn}</dt>
      <dd className="shrink-0 font-semibold text-ink-900">{verdi}</dd>
    </div>
  );
}
