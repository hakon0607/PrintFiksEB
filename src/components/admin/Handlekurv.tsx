'use client';

import { useMemo, useState } from 'react';
import { regnMargin } from '@/lib/margin';
import { kr } from '@/lib/settings';
import type {
  Color,
  DeliveryOption,
  Extra,
  Material,
  Product,
  WeightRange,
} from '@/lib/types';

/** En vare i bestillingen, slik den ser ut mens dere fyller ut skjemaet. */
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

/** Det som gjelder hele bestillingen: levering, startpris og tillegg. */
export type Rundt = {
  leveringId: string;
  startpris: boolean;
  ordreExtras: string[];
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

/** Bare ferdige modeller = fast pris og ingen startpris. */
export function bareGalleri(linjer: Linje[]): boolean {
  return linjer.length > 0 && linjer.every((l) => l.kind === 'galleri');
}

export function summer(
  linjer: Linje[],
  rundt: Rundt,
  data: { extras: Extra[]; levering: DeliveryOption[]; startpris: number }
) {
  const varer = linjer.reduce((s, l) => s + l.qty * l.unit_price, 0);
  const kost = linjer.reduce((s, l) => s + l.qty * l.unit_cost, 0);

  const valgteExtras = data.extras.filter((e) => rundt.ordreExtras.includes(e.id));
  const extraSum = valgteExtras.reduce((s, e) => s + Number(e.price), 0);

  const lev = data.levering.find((d) => d.id === rundt.leveringId);
  const leveringPris = Number(lev?.price ?? 0);

  const start = rundt.startpris && !bareGalleri(linjer) ? data.startpris : 0;

  const salg = varer + extraSum + leveringPris + start;
  return {
    varer,
    kost,
    extraSum,
    valgteExtras,
    leveringPris,
    leveringNavn: lev?.name ?? '',
    start,
    salg,
    overskudd: salg - kost,
  };
}

/** Kort beskrivelse: «2x Saksholder, 1x 3D-print i PLA». */
export function beskriv(linjer: Linje[]): string {
  return linjer
    .filter((l) => l.name.trim())
    .map((l) => `${l.qty}x ${l.name.trim()}`)
    .join(', ');
}

/* ------------------------------------------------------------------ */

type Fane = 'galleri' | 'print' | 'annet';

export function Handlekurv({
  linjer,
  rundt,
  produkter,
  materialer,
  farger,
  vektIntervaller,
  extras,
  leveringer,
  startpris,
  onLinjer,
  onRundt,
}: {
  linjer: Linje[];
  rundt: Rundt;
  produkter: Product[];
  materialer: Material[];
  farger: Color[];
  vektIntervaller: WeightRange[];
  extras: Extra[];
  leveringer: DeliveryOption[];
  startpris: number;
  onLinjer: (l: Linje[]) => void;
  onRundt: (r: Rundt) => void;
}) {
  const [fane, setFane] = useState<Fane>('galleri');
  const [sok, setSok] = useState('');

  // 3D-print
  const [materialId, setMaterialId] = useState(materialer[0]?.id ?? '');
  const [fargeId, setFargeId] = useState(farger[0]?.id ?? '');
  const [vektModus, setVektModus] = useState<'intervall' | 'gram'>('intervall');
  const [rangeId, setRangeId] = useState(vektIntervaller[0]?.id ?? '');
  const [gram, setGram] = useState('60');
  const [antall, setAntall] = useState(1);
  const [vareExtras, setVareExtras] = useState<string[]>([]);
  const [notat, setNotat] = useState('');

  // Annet
  const [annetNavn, setAnnetNavn] = useState('');
  const [annetPris, setAnnetPris] = useState('');

  const material = materialer.find((m) => m.id === materialId) ?? materialer[0];
  const farge = farger.find((f) => f.id === fargeId) ?? farger[0];
  const range = vektIntervaller.find((r) => r.id === rangeId) ?? vektIntervaller[0];
  const perGram = Number(material?.price_per_gram ?? 0);

  const vareTillegg = extras.filter((e) => e.scope === 'item' && e.active !== false);
  const ordreTillegg = extras.filter((e) => e.scope === 'order' && e.active !== false);

  const { minG, maxG } = useMemo(() => {
    if (vektModus === 'gram') {
      const g = Math.max(1, Math.min(5000, Number(gram.replace(',', '.')) || 0));
      return { minG: g, maxG: g };
    }
    return { minG: Number(range?.min_g ?? 0), maxG: Number(range?.max_g ?? 10) };
  }, [vektModus, gram, range]);

  const tilleggSum = vareTillegg
    .filter((e) => vareExtras.includes(e.id))
    .reduce((s, e) => s + Number(e.price), 0);

  const printMin = minG * perGram + tilleggSum;
  const printMaks = maxG * perGram + tilleggSum;
  const printPris = Math.round((printMin + printMaks) / 2);

  const treff = useMemo(() => {
    const q = sok.trim().toLowerCase();
    if (!q) return [];
    return produkter
      .filter((p) => p.active !== false)
      .filter((p) => (p.code ?? '').toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [produkter, sok]);

  const sum = summer(linjer, rundt, { extras, levering: leveringer, startpris });

  function leggTilProdukt(p: Product) {
    const finnes = linjer.find((l) => l.product_id === p.id);
    if (finnes) {
      onLinjer(linjer.map((l) => (l.lokalId === finnes.lokalId ? { ...l, qty: l.qty + 1 } : l)));
    } else {
      onLinjer([...linjer, linjeFraProdukt(p, materialer)]);
    }
    setSok('');
  }

  function leggTilPrint() {
    if (!material) return;
    const vekt = minG === maxG ? `${minG} g` : `${minG}–${maxG} g`;
    const tilleggNavn = vareTillegg
      .filter((e) => vareExtras.includes(e.id))
      .map((e) => e.name)
      .join(', ');

    const navn = [
      `3D-print i ${material.name}`,
      farge ? farge.name.toLowerCase() : '',
      vekt,
      tilleggNavn,
      notat.trim(),
    ]
      .filter(Boolean)
      .join(' · ');

    onLinjer([
      ...linjer,
      {
        lokalId: nyId(),
        product_id: null,
        code: '',
        name: navn,
        qty: antall,
        unit_price: printPris,
        unit_cost: 0,
        kind: 'egen',
      },
    ]);

    setAntall(1);
    setVareExtras([]);
    setNotat('');
  }

  function leggTilAnnet() {
    if (!annetNavn.trim()) return;
    onLinjer([
      ...linjer,
      {
        ...tomLinje(),
        name: annetNavn.trim(),
        unit_price: Number(annetPris.replace(',', '.')) || 0,
      },
    ]);
    setAnnetNavn('');
    setAnnetPris('');
  }

  function endreLinje(lokalId: string, patch: Partial<Linje>) {
    onLinjer(linjer.map((l) => (l.lokalId === lokalId ? { ...l, ...patch } : l)));
  }

  return (
    <div className="space-y-3">
      {/* ---------- Legg til ---------- */}
      <div className="rounded-2xl border border-ink-200 bg-white">
        <div className="flex gap-1 border-b border-ink-100 p-1.5">
          {(
            [
              ['galleri', 'Fra galleriet'],
              ['print', '3D-print'],
              ['annet', 'Reparasjon / annet'],
            ] as [Fane, string][]
          ).map(([id, navn]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFane(id)}
              className={`flex-1 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors ${
                fane === id ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-50'
              }`}
            >
              {navn}
            </button>
          ))}
        </div>

        <div className="p-4">
          {fane === 'galleri' && (
            <div className="relative">
              <input
                value={sok}
                onChange={(e) => setSok(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (treff[0]) leggTilProdukt(treff[0]);
                  }
                }}
                placeholder="Søk – ID eller navn, f.eks. 53417 eller saks"
                className="field"
                aria-label="Finn modell fra galleriet"
              />
              {treff.length > 0 && (
                <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-lift">
                  {treff.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => leggTilProdukt(p)}
                        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-brand-50"
                      >
                        <span className="rounded-full bg-ink-900 px-2 py-0.5 text-[10px] font-bold text-white">
                          {p.code}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
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
              <p className="hint">Ferdige modeller har fast pris og gir ingen startpris.</p>
            </div>
          )}

          {fane === 'print' && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="label">Materiale</span>
                  <select
                    value={materialId}
                    onChange={(e) => setMaterialId(e.target.value)}
                    className="field"
                  >
                    {materialer.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} · {Number(m.price_per_gram).toLocaleString('nb-NO', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        kr/g
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="label">Farge</span>
                  <select
                    value={fargeId}
                    onChange={(e) => setFargeId(e.target.value)}
                    className="field"
                  >
                    {farger.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <span className="label">Størrelse</span>
                <div className="mb-2 flex gap-2">
                  {(
                    [
                      ['intervall', 'Omtrent'],
                      ['gram', 'Nøyaktig vekt'],
                    ] as ['intervall' | 'gram', string][]
                  ).map(([id, navn]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setVektModus(id)}
                      className={`btn btn-sm ${
                        vektModus === id ? 'btn-dark' : 'border border-ink-200 bg-white text-ink-700'
                      }`}
                    >
                      {navn}
                    </button>
                  ))}
                </div>

                {vektModus === 'intervall' ? (
                  <select
                    value={rangeId}
                    onChange={(e) => setRangeId(e.target.value)}
                    className="field"
                  >
                    {vektIntervaller.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label} ({r.min_g}–{r.max_g} g)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      value={gram}
                      onChange={(e) => setGram(e.target.value)}
                      inputMode="decimal"
                      className="field w-28"
                      aria-label="Vekt i gram"
                    />
                    <span className="text-sm text-ink-500">gram</span>
                  </div>
                )}
              </div>

              {vareTillegg.length > 0 && (
                <div>
                  <span className="label">Tillegg på denne varen</span>
                  <div className="flex flex-wrap gap-2">
                    {vareTillegg.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() =>
                          setVareExtras((prev) =>
                            prev.includes(e.id)
                              ? prev.filter((x) => x !== e.id)
                              : [...prev, e.id]
                          )
                        }
                        className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                          vareExtras.includes(e.id)
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-ink-200 bg-white text-ink-600'
                        }`}
                      >
                        {e.name} +{kr(Number(e.price))}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="label">Antall</span>
                  <input
                    type="number"
                    min={1}
                    value={antall}
                    onChange={(e) => setAntall(Math.max(1, Number(e.target.value) || 1))}
                    className="field w-28"
                  />
                </label>
                <label className="block">
                  <span className="label">Notat på varen</span>
                  <input
                    value={notat}
                    onChange={(e) => setNotat(e.target.value)}
                    placeholder="F.eks. mål eller ønsker"
                    className="field"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-3">
                <p className="text-sm text-ink-600">
                  Regnes til{' '}
                  <span className="font-bold text-ink-900">
                    {printMin === printMaks
                      ? kr(printMin)
                      : `${Math.round(printMin)}–${Math.round(printMaks)} kr`}
                  </span>{' '}
                  {printMin !== printMaks && (
                    <span className="text-ink-400">· vi fører {kr(printPris)}</span>
                  )}
                </p>
                <button type="button" onClick={leggTilPrint} className="btn-primary btn-sm">
                  Legg til
                </button>
              </div>
            </div>
          )}

          {fane === 'annet' && (
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <label className="block">
                <span className="label">Hva skal vi gjøre?</span>
                <input
                  value={annetNavn}
                  onChange={(e) => setAnnetNavn(e.target.value)}
                  placeholder="F.eks. reparasjon av klips til oppvaskmaskin"
                  className="field"
                />
              </label>
              <label className="block">
                <span className="label">Pris</span>
                <input
                  value={annetPris}
                  onChange={(e) => setAnnetPris(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className="field w-28"
                />
              </label>
              <button type="button" onClick={leggTilAnnet} className="btn-primary btn-sm">
                Legg til
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Kurven ---------- */}
      <div className="rounded-2xl border border-ink-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="label mb-0">I bestillingen</span>
          {linjer.length > 0 && (
            <span className="text-xs font-semibold text-ink-500">{kr(sum.salg)} til sammen</span>
          )}
        </div>

        {linjer.length === 0 ? (
          <p className="mt-2 rounded-xl bg-ink-50 px-3.5 py-4 text-sm text-ink-500">
            Ingenting lagt til ennå. Bruk fanene over.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {linjer.map((l) => (
              <li key={l.lokalId} className="rounded-xl border border-ink-100 bg-ink-50/60 p-3">
                <div className="flex items-center gap-2">
                  {l.kind === 'galleri' && l.code && (
                    <span className="shrink-0 rounded-full bg-ink-900 px-2 py-0.5 text-[10px] font-bold text-white">
                      {l.code}
                    </span>
                  )}
                  {l.kind === 'galleri' ? (
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">
                      {l.name}
                    </span>
                  ) : (
                    <input
                      value={l.name}
                      onChange={(e) => endreLinje(l.lokalId, { name: e.target.value })}
                      className="min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm font-semibold"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => onLinjer(linjer.filter((x) => x.lokalId !== l.lokalId))}
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
                        endreLinje(l.lokalId, {
                          qty: Math.max(1, Math.round(Number(e.target.value) || 1)),
                        })
                      }
                      className="mt-0.5 w-full rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-ink-900"
                    />
                  </label>
                  <label className="block text-[11px] font-semibold text-ink-500">
                    Pris per stk
                    <input
                      type="number"
                      min={0}
                      value={l.unit_price}
                      onChange={(e) =>
                        endreLinje(l.lokalId, { unit_price: Number(e.target.value) || 0 })
                      }
                      className="mt-0.5 w-full rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-ink-900"
                    />
                  </label>
                  <label className="block text-[11px] font-semibold text-ink-500">
                    Koster oss
                    <input
                      type="number"
                      min={0}
                      value={l.unit_cost}
                      onChange={(e) =>
                        endreLinje(l.lokalId, { unit_cost: Number(e.target.value) || 0 })
                      }
                      className="mt-0.5 w-full rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-900"
                    />
                  </label>
                  <div className="text-[11px] font-semibold text-ink-500">
                    Til sammen
                    <p className="mt-2 text-sm font-bold text-ink-900">
                      {kr(l.qty * l.unit_price)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---------- Levering og tillegg ---------- */}
      <div className="rounded-2xl border border-ink-200 bg-white p-4">
        <span className="label">Levering</span>
        <div className="flex flex-wrap gap-2">
          {leveringer.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onRundt({ ...rundt, leveringId: d.id })}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                rundt.leveringId === d.id
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-ink-200 bg-white text-ink-600'
              }`}
            >
              {d.name} {Number(d.price) > 0 ? `+${kr(Number(d.price))}` : '· gratis'}
            </button>
          ))}
        </div>

        {ordreTillegg.length > 0 && (
          <>
            <span className="label mt-4">Tillegg på bestillingen</span>
            <div className="space-y-2">
              {ordreTillegg.map((e) => (
                <label
                  key={e.id}
                  className="flex items-start gap-2.5 text-sm font-semibold text-ink-700"
                >
                  <input
                    type="checkbox"
                    checked={rundt.ordreExtras.includes(e.id)}
                    onChange={(ev) =>
                      onRundt({
                        ...rundt,
                        ordreExtras: ev.target.checked
                          ? [...rundt.ordreExtras, e.id]
                          : rundt.ordreExtras.filter((x) => x !== e.id),
                      })
                    }
                    className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600"
                  />
                  <span>
                    {e.name} <span className="text-brand-700">+{kr(Number(e.price))}</span>
                    {e.description && (
                      <span className="block text-xs font-normal text-ink-500">
                        {e.description}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </>
        )}

        <label className="mt-4 flex items-start gap-2.5 text-sm font-semibold text-ink-700">
          <input
            type="checkbox"
            checked={rundt.startpris && !bareGalleri(linjer)}
            disabled={bareGalleri(linjer)}
            onChange={(e) => onRundt({ ...rundt, startpris: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600"
          />
          <span>
            Startpris {kr(startpris)}
            <span className="block text-xs font-normal text-ink-500">
              {bareGalleri(linjer)
                ? 'Bestillingen har bare ferdige modeller, så startprisen faller bort.'
                : 'Legges på én gang per bestilling.'}
            </span>
          </span>
        </label>
      </div>

      {/* ---------- Regnestykket ---------- */}
      {linjer.length > 0 && (
        <div className="rounded-2xl border border-ink-200 bg-ink-50/60 p-4">
          <span className="label">Regnestykket</span>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-600">Varer</dt>
              <dd className="font-semibold text-ink-900">{kr(sum.varer)}</dd>
            </div>
            {sum.valgteExtras.map((e) => (
              <div key={e.id} className="flex justify-between">
                <dt className="text-ink-600">{e.name}</dt>
                <dd className="font-semibold text-ink-900">{kr(Number(e.price))}</dd>
              </div>
            ))}
            {sum.start > 0 && (
              <div className="flex justify-between">
                <dt className="text-ink-600">Startpris</dt>
                <dd className="font-semibold text-ink-900">{kr(sum.start)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-600">{sum.leveringNavn || 'Levering'}</dt>
              <dd className="font-semibold text-ink-900">
                {sum.leveringPris === 0 ? 'Gratis' : kr(sum.leveringPris)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-ink-200 pt-2 text-base">
              <dt className="font-bold text-ink-900">Til sammen</dt>
              <dd className="font-bold text-brand-700">{kr(sum.salg)}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
