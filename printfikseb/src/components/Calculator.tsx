'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart, type SelectedExtra } from '@/lib/cart';
import { AnimatedNumber } from './AnimatedNumber';
import type { Material, WeightRange, Extra } from '@/lib/types';

type Props = {
  materials: Material[];
  weightRanges: WeightRange[];
  extras: Extra[];
  startFee: number;
  useStartFee: boolean;
  currency: string;
  repairPriceText: string;
  repairText: string;
};

type Modus = 'print' | 'reparasjon';

export function Calculator({
  materials,
  weightRanges,
  extras,
  startFee,
  useStartFee,
  currency,
  repairPriceText,
  repairText,
}: Props) {
  const { add, count } = useCart();

  const [modus, setModus] = useState<Modus>('print');
  const [materialId, setMaterialId] = useState(materials[0]?.id ?? '');
  const [vektModus, setVektModus] = useState<'range' | 'exact'>('range');
  const [rangeId, setRangeId] = useState(weightRanges[1]?.id ?? weightRanges[0]?.id ?? '');
  const [gram, setGram] = useState<string>('60');
  const [antall, setAntall] = useState(1);
  const [valgteExtras, setValgteExtras] = useState<string[]>([]);
  const [beskrivelse, setBeskrivelse] = useState('');
  const [reparasjon, setReparasjon] = useState('');
  const [lagtTil, setLagtTil] = useState(false);

  const material = materials.find((m) => m.id === materialId) ?? materials[0];
  const range = weightRanges.find((w) => w.id === rangeId) ?? weightRanges[0];

  const { minG, maxG } = useMemo(() => {
    if (vektModus === 'exact') {
      const g = Math.max(1, Math.min(5000, Number(gram.replace(',', '.')) || 0));
      return { minG: g, maxG: g };
    }
    return { minG: range?.min_g ?? 0, maxG: range?.max_g ?? 10 };
  }, [vektModus, gram, range]);

  const perGram = material?.price_per_gram ?? 0;

  const valgteExtraObjekter: SelectedExtra[] = useMemo(
    () =>
      extras
        .filter((e) => valgteExtras.includes(e.id))
        .map((e) => ({ id: e.id, name: e.name, price: Number(e.price), scope: e.scope })),
    [extras, valgteExtras]
  );

  const perItemExtras = valgteExtraObjekter
    .filter((e) => e.scope === 'item')
    .reduce((sum, e) => sum + e.price, 0);
  const orderExtras = valgteExtraObjekter.filter((e) => e.scope === 'order');
  const orderExtrasSum = orderExtras.reduce((sum, e) => sum + e.price, 0);

  const materialMin = minG * perGram * antall;
  const materialMaks = maxG * perGram * antall;
  const extrasTotal = perItemExtras * antall + orderExtrasSum;
  const startTillegg = useStartFee ? startFee : 0;
  const totalMin = materialMin + extrasTotal + startTillegg;
  const totalMaks = materialMaks + extrasTotal + startTillegg;
  const erIntervall = Math.round(totalMin) !== Math.round(totalMaks);

  function toggleExtra(id: string) {
    setValgteExtras((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function leggTilPrint() {
    if (!material) return;
    add({
      kind: 'print',
      qty: antall,
      title: `3D-print i ${material.name}`,
      materialId: material.id,
      materialName: material.name,
      pricePerGram: perGram,
      weightMode: vektModus,
      rangeLabel: vektModus === 'range' ? range?.label : undefined,
      minG,
      maxG,
      extras: valgteExtraObjekter,
      note: beskrivelse.trim() || undefined,
    });
    kvitter();
  }

  function leggTilReparasjon() {
    if (!reparasjon.trim()) return;
    add({
      kind: 'repair',
      qty: 1,
      title: 'Reparasjon',
      description: reparasjon.trim(),
    });
    setReparasjon('');
    kvitter();
  }

  function kvitter() {
    setLagtTil(true);
    window.setTimeout(() => setLagtTil(false), 2600);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-start">
      {/* -------- Venstre: valg -------- */}
      <div className="space-y-5">
        <div className="inline-flex rounded-full border border-ink-200 bg-white p-1 shadow-sm">
          {(
            [
              { id: 'print', label: '3D-print' },
              { id: 'reparasjon', label: 'Reparasjon' },
            ] as { id: Modus; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setModus(t.id)}
              className={`relative rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                modus === t.id ? 'text-white' : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              {modus === t.id && (
                <motion.span
                  layoutId="kalk-tab"
                  className="absolute inset-0 rounded-full bg-brand-600"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {modus === 'print' ? (
            <motion.div
              key="print"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              {/* 1. Hva */}
              <Seksjon nummer={1} tittel="Hva skal vi lage?">
                <textarea
                  value={beskrivelse}
                  onChange={(e) => setBeskrivelse(e.target.value)}
                  rows={3}
                  placeholder="F.eks. «En holder til saksene på pulten, ca. 12 cm høy» eller «Jeg har en STL-fil jeg kan sende»"
                  className="field resize-none"
                />
                <p className="hint">
                  Jo mer du skriver, jo raskere kan vi gi deg en nøyaktig pris. Du kan også bare
                  skrive det i meldingen etterpå.
                </p>
              </Seksjon>

              {/* 2. Materiale */}
              <Seksjon nummer={2} tittel="Velg materiale">
                <div className="grid gap-3 sm:grid-cols-2">
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
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-ink-900">{m.name}</span>
                          <span className="text-sm font-bold text-brand-700">
                            {m.price_per_gram.toLocaleString('nb-NO', {
                              minimumFractionDigits: 2,
                            })}{' '}
                            {currency}/g
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{m.description}</p>
                      </button>
                    );
                  })}
                </div>
              </Seksjon>

              {/* 3. Størrelse */}
              <Seksjon nummer={3} tittel="Hvor stor er modellen?">
                <div className="mb-4 inline-flex rounded-full bg-ink-50 p-1 text-sm">
                  {(
                    [
                      { id: 'range', label: 'Jeg vet det omtrent' },
                      { id: 'exact', label: 'Jeg vet vekten' },
                    ] as { id: 'range' | 'exact'; label: string }[]
                  ).map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setVektModus(o.id)}
                      className={`rounded-full px-4 py-1.5 font-semibold transition-colors ${
                        vektModus === o.id
                          ? 'bg-white text-ink-900 shadow-sm'
                          : 'text-ink-500 hover:text-ink-800'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>

                {vektModus === 'range' ? (
                  <div className="grid gap-2.5 sm:grid-cols-2">
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
                          <span className="mt-0.5 block text-xs text-ink-500">
                            {Math.round(w.min_g * perGram)}–{Math.round(w.max_g * perGram)} {currency}{' '}
                            i materiale
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="max-w-xs">
                    <label className="label" htmlFor="gram">
                      Vekt i gram
                    </label>
                    <input
                      id="gram"
                      type="number"
                      min={1}
                      max={5000}
                      value={gram}
                      onChange={(e) => setGram(e.target.value)}
                      className="field"
                    />
                    <p className="hint">
                      Slicer-programmer som Bambu Studio, Cura eller PrusaSlicer viser vekten i gram.
                    </p>
                  </div>
                )}
              </Seksjon>

              {/* 4. Antall + tillegg */}
              <Seksjon nummer={4} tittel="Antall og tillegg">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-ink-700">Antall</span>
                  <div className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setAntall((a) => Math.max(1, a - 1))}
                      className="h-8 w-8 rounded-full text-lg font-bold text-ink-600 transition-colors hover:bg-ink-50"
                      aria-label="Færre"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-bold">{antall}</span>
                    <button
                      type="button"
                      onClick={() => setAntall((a) => Math.min(99, a + 1))}
                      className="h-8 w-8 rounded-full text-lg font-bold text-ink-600 transition-colors hover:bg-ink-50"
                      aria-label="Flere"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  {extras.map((e) => {
                    const valgt = valgteExtras.includes(e.id);
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => toggleExtra(e.id)}
                        className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 ${
                          valgt
                            ? 'border-brand-500 bg-brand-50 ring-4 ring-brand-100'
                            : 'border-ink-200 bg-white hover:border-brand-300'
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                            valgt ? 'border-brand-600 bg-brand-600' : 'border-ink-300 bg-white'
                          }`}
                        >
                          {valgt && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path
                                d="M5 13l4 4L19 7"
                                stroke="white"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        <span className="flex-1">
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="text-sm font-semibold text-ink-900">{e.name}</span>
                            <span className="shrink-0 text-sm font-bold text-brand-700">
                              +{Math.round(Number(e.price))} {currency}
                              {e.scope === 'item' && antall > 1 ? ' pr. stk' : ''}
                            </span>
                          </span>
                          {e.description && (
                            <span className="mt-1 block text-xs leading-relaxed text-ink-500">
                              {e.description}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Seksjon>
            </motion.div>
          ) : (
            <motion.div
              key="reparasjon"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <div className="card p-6">
                <h3 className="text-lg font-semibold">Reparasjon</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{repairText}</p>
                <div className="mt-5">
                  <label className="label" htmlFor="reparasjon">
                    Hva er ødelagt?
                  </label>
                  <textarea
                    id="reparasjon"
                    rows={4}
                    value={reparasjon}
                    onChange={(e) => setReparasjon(e.target.value)}
                    placeholder="F.eks. «Håndtaket på oppvaskmaskinkurven har knekt. Det er ca. 6 cm langt.»"
                    className="field resize-none"
                  />
                  <p className="hint">
                    Send gjerne bilde og mål når du sender meldingen til oss etterpå.
                  </p>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={leggTilReparasjon}
                    disabled={!reparasjon.trim()}
                    className="btn-primary"
                  >
                    Legg i handleliste
                  </button>
                  <span className="chip">{repairPriceText}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* -------- Høyre: prissammendrag -------- */}
      {modus === 'print' && (
        <div className="lg:sticky lg:top-24">
          <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-lift">
            <div className="relative overflow-hidden bg-ink-900 px-6 py-7 text-white">
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
                  Estimert pris
                </p>
                <p className="mt-2 text-4xl font-bold leading-none">
                  {erIntervall ? (
                    <>
                      <AnimatedNumber value={totalMin} />
                      <span className="mx-1 text-ink-400">–</span>
                      <AnimatedNumber value={totalMaks} />
                    </>
                  ) : (
                    <AnimatedNumber value={totalMin} />
                  )}
                  <span className="ml-1.5 text-lg font-semibold text-ink-300">{currency}</span>
                </p>
                <p className="mt-2 text-xs leading-relaxed text-ink-400">
                  Du får endelig pris på melding, og godkjenner før vi starter.
                </p>
              </div>
            </div>

            <dl className="divide-y divide-ink-100 px-6 py-4 text-sm">
              <Rad
                navn={`${material?.name ?? 'Materiale'} · ${
                  minG === maxG ? `${minG} g` : `${minG}–${maxG} g`
                }${antall > 1 ? ` × ${antall}` : ''}`}
                verdi={
                  Math.round(materialMin) === Math.round(materialMaks)
                    ? `${Math.round(materialMin)} ${currency}`
                    : `${Math.round(materialMin)}–${Math.round(materialMaks)} ${currency}`
                }
              />
              {valgteExtraObjekter.map((e) => (
                <Rad
                  key={e.id}
                  navn={`${e.name}${e.scope === 'item' && antall > 1 ? ` × ${antall}` : ''}`}
                  verdi={`${Math.round(e.price * (e.scope === 'item' ? antall : 1))} ${currency}`}
                />
              ))}
              {useStartFee && <Rad navn="Startpris (én gang)" verdi={`${Math.round(startFee)} ${currency}`} />}
              <Rad navn="Levering" verdi="Velges i neste steg" tone="muted" />
            </dl>

            <div className="border-t border-ink-100 bg-ink-50/60 p-6">
              <button type="button" onClick={leggTilPrint} className="btn-primary w-full">
                Legg i handleliste
              </button>
              <AnimatePresence>
                {lagtTil && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden pt-3 text-center text-sm font-semibold text-emerald-600"
                  >
                    Lagt til! Du har {count} ting i handlelisten.
                  </motion.p>
                )}
              </AnimatePresence>
              {count > 0 && (
                <Link href="/bestill" className="btn-ghost mt-3 w-full">
                  Gå til handlelisten ({count})
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Seksjon({
  nummer,
  tittel,
  children,
}: {
  nummer: number;
  tittel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
          {nummer}
        </span>
        <h2 className="text-base font-semibold">{tittel}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Rad({ navn, verdi, tone }: { navn: string; verdi: string; tone?: 'muted' }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className={tone === 'muted' ? 'text-ink-400' : 'text-ink-600'}>{navn}</dt>
      <dd className={`shrink-0 font-semibold ${tone === 'muted' ? 'text-ink-400' : 'text-ink-900'}`}>
        {verdi}
      </dd>
    </div>
  );
}
