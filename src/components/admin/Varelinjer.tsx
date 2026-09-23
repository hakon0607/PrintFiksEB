'use client';

import { useMemo, useState } from 'react';
import { regnMargin } from '@/lib/margin';
import { kr } from '@/lib/settings';
import type { Material, Product } from '@/lib/types';

/** En varelinje slik den ser ut mens dere fyller ut skjemaet. */
export type Linje = {
  lokalId: string;
  product_id: string | null;
  code: string;
  name: string;
  qty: number;
  unit_price: number;
  unit_cost: number;
  kind: 'galleri' | 'egen';
};

let teller = 0;
export function nyId(): string {
  teller += 1;
  return `l${Date.now().toString(36)}${teller}`;
}

export function linjeFraProdukt(p: Product, materialer: Material[]): Linje {
  const m = regnMargin(p as unknown as Record<string, unknown>, materialer);
  return {
    lokalId: nyId(),
    product_id: p.id,
    code: p.code ?? '',
    name: p.name,
    qty: 1,
    unit_price: Number(p.price ?? 0),
    unit_cost: Math.round(m.kost * 100) / 100,
    kind: 'galleri',
  };
}

export function tomLinje(): Linje {
  return {
    lokalId: nyId(),
    product_id: null,
    code: '',
    name: '',
    qty: 1,
    unit_price: 0,
    unit_cost: 0,
    kind: 'egen',
  };
}

export function summer(linjer: Linje[]) {
  const salg = linjer.reduce((s, l) => s + l.qty * l.unit_price, 0);
  const kost = linjer.reduce((s, l) => s + l.qty * l.unit_cost, 0);
  return { salg, kost, overskudd: salg - kost };
}

/** Lager en kort beskrivelse: «2x Saksholder, 1x Nøkkelring». */
export function beskriv(linjer: Linje[]): string {
  return linjer
    .filter((l) => l.name.trim())
    .map((l) => `${l.qty}x ${l.name.trim()}`)
    .join(', ');
}

export function Varelinjer({
  linjer,
  produkter,
  materialer,
  onEndre,
}: {
  linjer: Linje[];
  produkter: Product[];
  materialer: Material[];
  onEndre: (linjer: Linje[]) => void;
}) {
  const [sok, setSok] = useState('');

  const treff = useMemo(() => {
    const q = sok.trim().toLowerCase();
    if (!q) return [];
    return produkter
      .filter((p) => p.active !== false)
      .filter(
        (p) => (p.code ?? '').toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [produkter, sok]);

  function endreLinje(lokalId: string, patch: Partial<Linje>) {
    onEndre(linjer.map((l) => (l.lokalId === lokalId ? { ...l, ...patch } : l)));
  }

  function fjern(lokalId: string) {
    onEndre(linjer.filter((l) => l.lokalId !== lokalId));
  }

  function velg(p: Product) {
    const finnes = linjer.find((l) => l.product_id === p.id);
    if (finnes) {
      endreLinje(finnes.lokalId, { qty: finnes.qty + 1 });
    } else {
      onEndre([...linjer, linjeFraProdukt(p, materialer)]);
    }
    setSok('');
  }

  const sum = summer(linjer);

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <span className="label mb-0">Hva ble solgt</span>
        {linjer.length > 0 && (
          <span className="text-xs font-semibold text-ink-500">{kr(sum.salg)} til sammen</span>
        )}
      </div>

      {linjer.length > 0 && (
        <ul className="mt-2 space-y-2">
          {linjer.map((l) => (
            <li key={l.lokalId} className="rounded-2xl border border-ink-200 bg-white p-3">
              <div className="flex items-center gap-2">
                {l.kind === 'galleri' ? (
                  <>
                    <span className="shrink-0 rounded-full bg-ink-900 px-2 py-0.5 text-[10px] font-bold text-white">
                      {l.code || 'ID'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">
                      {l.name}
                    </span>
                  </>
                ) : (
                  <input
                    value={l.name}
                    onChange={(e) => endreLinje(l.lokalId, { name: e.target.value })}
                    placeholder="Hva lagde dere?"
                    className="min-w-0 flex-1 rounded-xl border border-ink-200 px-3 py-2 text-sm font-semibold"
                  />
                )}
                <button
                  type="button"
                  onClick={() => fjern(l.lokalId)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Fjern
                </button>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <label className="block text-[11px] font-semibold text-ink-500">
                  Antall
                  <input
                    type="number"
                    min={1}
                    value={l.qty}
                    onChange={(e) =>
                      endreLinje(l.lokalId, { qty: Math.max(1, Math.round(Number(e.target.value) || 1)) })
                    }
                    className="mt-0.5 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-900"
                  />
                </label>
                <label className="block text-[11px] font-semibold text-ink-500">
                  Pris per stk
                  <input
                    type="number"
                    min={0}
                    value={l.unit_price}
                    onChange={(e) => endreLinje(l.lokalId, { unit_price: Number(e.target.value) || 0 })}
                    className="mt-0.5 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-900"
                  />
                </label>
                <label className="block text-[11px] font-semibold text-ink-500">
                  Koster oss
                  <input
                    type="number"
                    min={0}
                    value={l.unit_cost}
                    onChange={(e) => endreLinje(l.lokalId, { unit_cost: Number(e.target.value) || 0 })}
                    className="mt-0.5 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-900"
                  />
                </label>
                <div className="text-[11px] font-semibold text-ink-500">
                  Til sammen
                  <p className="mt-2 text-sm font-bold text-ink-900">{kr(l.qty * l.unit_price)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="relative mt-2">
        <input
          value={sok}
          onChange={(e) => setSok(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (treff[0]) velg(treff[0]);
            }
          }}
          placeholder="Søk i galleriet – ID eller navn, f.eks. 53417 eller saks"
          className="field"
          aria-label="Finn modell fra galleriet"
        />

        {treff.length > 0 && (
          <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-lift">
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
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
                  <span className="shrink-0 text-sm font-bold text-brand-700">
                    {kr(Number(p.price ?? 0))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => onEndre([...linjer, tomLinje()])}
        className="btn btn-sm mt-2 border border-ink-200 bg-white text-ink-700"
      >
        + Noe vi lager selv
      </button>
    </div>
  );
}
