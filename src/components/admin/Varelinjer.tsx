'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { regnMargin } from '@/lib/margin';
import { kr } from '@/lib/settings';
import type { Material, OrderItem, Product } from '@/lib/types';

/** Varelinjer uten id enda – brukes når bestillingen ikke er lagret. */
export type NyLinje = Omit<OrderItem, 'id' | 'order_id' | 'created_at'>;

export function lagLinjeFraProdukt(p: Product, materialer: Material[], sort = 100): NyLinje {
  const m = regnMargin(p as unknown as Record<string, unknown>, materialer);
  return {
    product_id: p.id,
    code: p.code ?? '',
    name: p.name,
    qty: 1,
    unit_price: Number(p.price ?? 0),
    unit_cost: Math.round(m.kost * 100) / 100,
    kind: 'galleri',
    sort,
  };
}

export function summerLinjer(linjer: { qty: number; unit_price: number; unit_cost: number }[]) {
  const salg = linjer.reduce((s, l) => s + Number(l.qty) * Number(l.unit_price), 0);
  const kost = linjer.reduce((s, l) => s + Number(l.qty) * Number(l.unit_cost), 0);
  return { salg, kost, fortjeneste: salg - kost };
}

type Linje = NyLinje & { id?: string };

export function Varelinjer({
  linjer,
  produkter,
  materialer,
  onLeggTil,
  onEndre,
  onSlett,
  kompakt = false,
}: {
  linjer: Linje[];
  produkter: Product[];
  materialer: Material[];
  onLeggTil: (linje: NyLinje) => void;
  onEndre: (index: number, patch: Partial<NyLinje>) => void;
  onSlett: (index: number) => void;
  kompakt?: boolean;
}) {
  const [sok, setSok] = useState('');

  const treff = useMemo(() => {
    const q = sok.trim().toLowerCase();
    if (!q) return [];
    return produkter
      .filter(
        (p) =>
          (p.code ?? '').toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (p.category ?? '').toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [produkter, sok]);

  const sum = summerLinjer(linjer);

  function velg(p: Product) {
    onLeggTil(lagLinjeFraProdukt(p, materialer, (linjer.length + 1) * 10));
    setSok('');
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">
          Hva ble solgt
        </p>
        {linjer.length > 0 && (
          <p className="text-xs font-semibold text-ink-500">
            {kr(sum.salg)} · vi tjener {kr(sum.fortjeneste)}
          </p>
        )}
      </div>

      {/* Linjene */}
      {linjer.length > 0 && (
        <ul className="mt-3 space-y-2">
          <AnimatePresence initial={false}>
            {linjer.map((l, i) => (
              <motion.li
                key={l.id ?? `${l.name}-${i}`}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-ink-100 bg-ink-50/60 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {l.kind === 'galleri' ? (
                    <>
                      <span className="rounded-full bg-ink-900 px-2 py-0.5 text-[10px] font-bold text-white">
                        ID {l.code || '—'}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">
                        {l.name}
                      </span>
                    </>
                  ) : (
                    <input
                      value={l.name}
                      onChange={(e) => onEndre(i, { name: e.target.value })}
                      placeholder="Hva lagde dere?"
                      className="min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm font-semibold"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => onSlett(i)}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Fjern
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <label className="text-[11px] font-semibold text-ink-500">
                    Antall
                    <input
                      type="number"
                      min={1}
                      value={l.qty}
                      onChange={(e) => onEndre(i, { qty: Math.max(1, Number(e.target.value) || 1) })}
                      className="mt-0.5 w-full rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-ink-900"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-ink-500">
                    Pris per stk
                    <input
                      type="number"
                      min={0}
                      value={l.unit_price}
                      onChange={(e) => onEndre(i, { unit_price: Number(e.target.value) || 0 })}
                      className="mt-0.5 w-full rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-ink-900"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-ink-500">
                    Koster oss
                    <input
                      type="number"
                      min={0}
                      value={l.unit_cost}
                      onChange={(e) => onEndre(i, { unit_cost: Number(e.target.value) || 0 })}
                      className="mt-0.5 w-full rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-900"
                    />
                  </label>
                  <div className="text-[11px] font-semibold text-ink-500">
                    Til sammen
                    <p className="mt-1 text-sm font-bold text-ink-900">
                      {kr(Number(l.qty) * Number(l.unit_price))}
                    </p>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {/* Søk i galleriet */}
      <div className="relative mt-3">
        <input
          value={sok}
          onChange={(e) => setSok(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && treff[0]) {
              e.preventDefault();
              velg(treff[0]);
            }
          }}
          placeholder="Skriv ID-nummer eller navn fra galleriet, f.eks. 53417 eller saks"
          className="field"
          aria-label="Finn modell fra galleriet"
        />

        {treff.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-lift">
            {treff.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => velg(p)}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-brand-50"
                >
                  <span className="rounded-full bg-ink-900 px-2 py-0.5 text-[10px] font-bold text-white">
                    {p.code}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">
                    {p.name}
                  </span>
                  <span className="shrink-0 text-sm font-bold text-brand-700">
                    {kr(Number(p.price ?? 0))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() =>
            onLeggTil({
              product_id: null,
              code: '',
              name: '',
              qty: 1,
              unit_price: 0,
              unit_cost: 0,
              kind: 'egen',
              sort: (linjer.length + 1) * 10,
            })
          }
          className="btn btn-sm border border-ink-200 bg-white text-ink-700"
        >
          + Noe vi lager selv
        </button>
        {!kompakt && (
          <p className="text-xs text-ink-500">
            Prisen og kostprisen hentes fra galleriet, men du kan overstyre begge her.
          </p>
        )}
      </div>
    </div>
  );
}
