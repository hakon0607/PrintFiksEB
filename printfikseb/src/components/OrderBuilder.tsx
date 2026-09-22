'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart, type SelectedExtra } from '@/lib/cart';
import type { Material, WeightRange, Extra } from '@/lib/types';

type Props = {
  materials: Material[];
  weightRanges: WeightRange[];
  extras: Extra[];
  currency: string;
  repairPriceText: string;
  repairText: string;
  forhandsvalgtMaterial?: string;
  forhandsvalgtStorrelse?: string;
};

type Modus = 'print' | 'reparasjon';

/**
 * Det detaljerte skjemaet der kunden setter sammen det de vil ha.
 * Bor på /bestill – priskalkulatoren er en enklere, separat side.
 */
export function OrderBuilder({
  materials,
  weightRanges,
  extras,
  currency,
  repairPriceText,
  repairText,
  forhandsvalgtMaterial,
  forhandsvalgtStorrelse,
}: Props) {
  const { add } = useCart();

  const [apen, setApen] = useState(true);
  const [modus, setModus] = useState<Modus>('print');
  const [materialId, setMaterialId] = useState(
    forhandsvalgtMaterial && materials.some((m) => m.id === forhandsvalgtMaterial)
      ? forhandsvalgtMaterial
      : (materials[0]?.id ?? '')
  );
  const [vektModus, setVektModus] = useState<'range' | 'exact'>('range');
  const [rangeId, setRangeId] = useState(
    forhandsvalgtStorrelse && weightRanges.some((w) => w.id === forhandsvalgtStorrelse)
      ? forhandsvalgtStorrelse
      : (weightRanges[1]?.id ?? weightRanges[0]?.id ?? '')
  );
  const [gram, setGram] = useState('60');
  const [antall, setAntall] = useState(1);
  const [valgteExtras, setValgteExtras] = useState<string[]>([]);
  const [beskrivelse, setBeskrivelse] = useState('');
  const [reparasjon, setReparasjon] = useState('');
  const [kvittering, setKvittering] = useState('');

  const material = materials.find((m) => m.id === materialId) ?? materials[0];
  const range = weightRanges.find((w) => w.id === rangeId) ?? weightRanges[0];
  const perGram = material?.price_per_gram ?? 0;

  const { minG, maxG } = useMemo(() => {
    if (vektModus === 'exact') {
      const g = Math.max(1, Math.min(5000, Number(gram.replace(',', '.')) || 0));
      return { minG: g, maxG: g };
    }
    return { minG: range?.min_g ?? 0, maxG: range?.max_g ?? 10 };
  }, [vektModus, gram, range]);

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

  const linjeMin = (minG * perGram + perItemExtras) * antall;
  const linjeMaks = (maxG * perGram + perItemExtras) * antall;

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
    setBeskrivelse('');
    setAntall(1);
    setValgteExtras([]);
    kvitter('Lagt til i bestillingen ✓');
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
    kvitter('Reparasjonen er lagt til ✓');
  }

  function kvitter(tekst: string) {
    setKvittering(tekst);
    window.setTimeout(() => setKvittering(''), 2600);
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-brand-200 bg-white shadow-soft">
      <button
        type="button"
        onClick={() => setApen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 bg-brand-50/70 px-6 py-5 text-left transition-colors hover:bg-brand-50"
      >
        <span>
          <span className="block text-base font-semibold text-ink-900">
            Legg til noe vi skal lage
          </span>
          <span className="mt-0.5 block text-sm text-ink-600">
            Beskriv hva du vil ha, velg materiale, størrelse og antall
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
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="p-6">
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
                        layoutId="bygger-tab"
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
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22 }}
                    className="mt-6 space-y-6"
                  >
                    <div>
                      <label className="label" htmlFor="hva">
                        Hva skal vi lage?
                      </label>
                      <textarea
                        id="hva"
                        rows={3}
                        value={beskrivelse}
                        onChange={(e) => setBeskrivelse(e.target.value)}
                        placeholder="F.eks. «En holder til saksene på pulten, ca. 12 cm høy» eller «Jeg har en STL-fil jeg kan sende»"
                        className="field resize-none"
                      />
                      <p className="hint">
                        Jo mer du skriver, jo raskere kan vi gi deg en nøyaktig pris.
                      </p>
                    </div>

                    <div>
                      <span className="label">Materiale</span>
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
                                  : 'border-ink-200 bg-white hover:border-brand-300'
                              }`}
                            >
                              <span className="flex items-center justify-between">
                                <span className="font-semibold text-ink-900">{m.name}</span>
                                <span className="text-sm font-bold text-brand-700">
                                  {m.price_per_gram.toLocaleString('nb-NO', {
                                    minimumFractionDigits: 2,
                                  })}{' '}
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
                    </div>

                    <div>
                      <span className="label">Størrelse</span>
                      <div className="mb-3 inline-flex rounded-full bg-ink-50 p-1 text-sm">
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
                                  {Math.round(w.min_g * perGram)}–{Math.round(w.max_g * perGram)}{' '}
                                  {currency} i materiale
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="max-w-xs">
                          <input
                            type="number"
                            min={1}
                            max={5000}
                            value={gram}
                            onChange={(e) => setGram(e.target.value)}
                            className="field"
                            aria-label="Vekt i gram"
                          />
                          <p className="hint">
                            Vekten i gram. Slicere som Bambu Studio, Cura og PrusaSlicer viser den.
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="label">Antall og tillegg</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-ink-600">Antall</span>
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
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-ink-50 px-5 py-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.1em] text-ink-400">
                          Denne linjen
                        </p>
                        <p className="mt-0.5 text-xl font-bold text-ink-900">
                          {Math.round(linjeMin) === Math.round(linjeMaks)
                            ? `${Math.round(linjeMin)} ${currency}`
                            : `${Math.round(linjeMin)}–${Math.round(linjeMaks)} ${currency}`}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          Startpris og levering kommer i tillegg under
                        </p>
                      </div>
                      <button type="button" onClick={leggTilPrint} className="btn-primary">
                        Legg til i bestillingen
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="reparasjon"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22 }}
                    className="mt-6"
                  >
                    <p className="text-sm leading-relaxed text-ink-600">{repairText}</p>
                    <div className="mt-4">
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
                      <p className="hint">Send gjerne bilde og mål når du sender meldingen til oss.</p>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={leggTilReparasjon}
                        disabled={!reparasjon.trim()}
                        className="btn-primary"
                      >
                        Legg til i bestillingen
                      </button>
                      <span className="chip">{repairPriceText}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {kvittering && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden pt-4 text-center text-sm font-semibold text-emerald-600"
                  >
                    {kvittering}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
