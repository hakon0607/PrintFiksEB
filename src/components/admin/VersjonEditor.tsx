'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ImageListUpload } from './ImageListUpload';
import { regnMargin } from '@/lib/margin';
import { kr } from '@/lib/settings';
import { nyVersjonId, type Versjon } from '@/lib/versjoner';
import type { Material } from '@/lib/types';

type Rad = { id: string; navn: string; pris: string; vekt_g: string; bilder: string[] };

function tilRader(verdi: unknown): Rad[] {
  if (!Array.isArray(verdi)) return [];
  return verdi
    .filter((v) => v && typeof v === 'object')
    .map((v, i) => {
      const o = v as Record<string, unknown>;
      return {
        id: String(o.id ?? `v${i}`),
        navn: String(o.navn ?? ''),
        pris: o.pris === null || o.pris === undefined ? '' : String(o.pris),
        vekt_g: o.vekt_g === null || o.vekt_g === undefined ? '' : String(o.vekt_g),
        bilder: Array.isArray(o.bilder) ? (o.bilder as unknown[]).map(String) : [],
      };
    });
}

function tilLagring(rader: Rad[]): Versjon[] {
  const tall = (s: string) => {
    const n = Number(s.replace(',', '.'));
    return s.trim() === '' || !Number.isFinite(n) ? null : n;
  };
  return rader.map((r) => ({
    id: r.id,
    navn: r.navn.trim(),
    pris: Math.max(0, tall(r.pris) ?? 0),
    vekt_g: tall(r.vekt_g),
    bilder: r.bilder,
  }));
}

/**
 * Versjoner av en modell – mest størrelser, men dere bestemmer navnet selv.
 * Hver versjon får egen pris, eventuelt egen vekt og egne bilder.
 */
export function VersjonEditor({
  verdi,
  rad,
  materialer,
  onEndre,
}: {
  verdi: unknown;
  rad: Record<string, unknown>;
  materialer: Material[];
  onEndre: (v: unknown, straks?: boolean) => void;
}) {
  const [rader, setRader] = useState<Rad[]>(() => tilRader(verdi));
  const sist = useRef(JSON.stringify(verdi ?? []));

  // Endrer noen andre versjonene (sanntid), henter vi dem inn
  useEffect(() => {
    const ny = JSON.stringify(verdi ?? []);
    if (ny !== sist.current) {
      sist.current = ny;
      setRader(tilRader(verdi));
    }
  }, [verdi]);

  function lagre(nye: Rad[]) {
    const data = tilLagring(nye);
    sist.current = JSON.stringify(data);
    onEndre(data, true);
  }

  function oppdater(id: string, patch: Partial<Rad>, straks = false) {
    const nye = rader.map((r) => (r.id === id ? { ...r, ...patch } : r));
    setRader(nye);
    if (straks) lagre(nye);
  }

  function leggTil() {
    const nye = [
      ...rader,
      {
        id: nyVersjonId(),
        navn: '',
        pris: String(rad.price ?? ''),
        vekt_g: rad.weight_g ? String(rad.weight_g) : '',
        bilder: [],
      },
    ];
    setRader(nye);
    lagre(nye);
  }

  function fjern(id: string) {
    const r = rader.find((x) => x.id === id);
    if (r && (r.navn || r.bilder.length) && !window.confirm(`Slette versjonen «${r.navn || 'uten navn'}»?`)) return;
    const nye = rader.filter((x) => x.id !== id);
    setRader(nye);
    lagre(nye);
  }

  function flytt(i: number, retning: -1 | 1) {
    const j = i + retning;
    if (j < 0 || j >= rader.length) return;
    const nye = [...rader];
    [nye[i], nye[j]] = [nye[j], nye[i]];
    setRader(nye);
    lagre(nye);
  }

  return (
    <div>
      <span className="label">Versjoner (valgfritt)</span>
      <p className="hint !mt-0 mb-3">
        {rader.length === 0
          ? 'Finnes modellen i flere størrelser eller utgaver? Legg dem til her. Står det ingen, selges den i én versjon med prisen over.'
          : 'Kunden velger versjon på produktsiden. Prisen over brukes ikke når det finnes versjoner – hver versjon har sin egen. Den øverste er valgt fra start.'}
      </p>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {rader.map((r, i) => {
            const m = regnMargin(
              {
                ...rad,
                price: Number(r.pris.replace(',', '.')) || 0,
                weight_g: r.vekt_g || rad.weight_g,
                // egen vekt på versjonen = regn ut fra den, ikke fra modellens kostpris
                cost_price: r.vekt_g ? 0 : rad.cost_price,
              },
              materialer
            );
            const kanRegne = m.egenKostpris || (m.kjentMateriale && m.vekt > 0);
            return (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl border border-ink-200 bg-ink-50/50 p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-900 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <input
                    value={r.navn}
                    onChange={(e) => oppdater(r.id, { navn: e.target.value })}
                    onBlur={() => lagre(rader)}
                    placeholder="Navn, f.eks. Liten, Stor eller 10 cm"
                    className="field flex-1 !py-2"
                    aria-label={`Navn på versjon ${i + 1}`}
                  />
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => flytt(i, -1)}
                      disabled={i === 0}
                      className="grid h-9 w-9 place-items-center rounded-xl border border-ink-200 bg-white text-ink-500 disabled:opacity-30"
                      aria-label="Flytt opp"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => flytt(i, 1)}
                      disabled={i === rader.length - 1}
                      className="grid h-9 w-9 place-items-center rounded-xl border border-ink-200 bg-white text-ink-500 disabled:opacity-30"
                      aria-label="Flytt ned"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => fjern(r.id)}
                      className="grid h-9 w-9 place-items-center rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50"
                      aria-label="Slett versjonen"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {!r.navn.trim() && (
                  <p className="mt-2 text-xs font-semibold text-amber-700">
                    Gi versjonen et navn – uten navn vises den ikke på nettsiden.
                  </p>
                )}

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="label">Pris til kunden</span>
                    <div className="relative">
                      <input
                        type="number"
                        step="1"
                        value={r.pris}
                        onChange={(e) => oppdater(r.id, { pris: e.target.value })}
                        onBlur={() => lagre(rader)}
                        className="field pr-12"
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-400">
                        kr
                      </span>
                    </div>
                  </label>
                  <label className="block">
                    <span className="label">Vekt (valgfritt)</span>
                    <div className="relative">
                      <input
                        type="number"
                        step="1"
                        value={r.vekt_g}
                        onChange={(e) => oppdater(r.id, { vekt_g: e.target.value })}
                        onBlur={() => lagre(rader)}
                        placeholder={rad.weight_g ? String(rad.weight_g) : ''}
                        className="field pr-16"
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-400">
                        gram
                      </span>
                    </div>
                  </label>
                </div>

                <p
                  className={`mt-2 text-[13px] font-semibold ${
                    !kanRegne ? 'text-ink-400' : m.overskudd > 0 ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {!kanRegne
                    ? 'Skriv vekt (og materiale over), så ser dere hva denne versjonen tjener.'
                    : m.overskudd > 0
                      ? `Koster oss ca. ${kr(m.kost)} · vi tjener ${kr(m.overskudd)}`
                      : `Koster oss ca. ${kr(m.kost)} · vi taper ${kr(Math.abs(m.overskudd))} – sett prisen opp`}
                </p>

                <div className="mt-3">
                  <ImageListUpload
                    label="Bilder av denne versjonen"
                    help="Vises når kunden velger versjonen. Står det ingen, vises modellens vanlige bilder."
                    value={r.bilder}
                    onChange={(urls) => oppdater(r.id, { bilder: urls }, true)}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <button type="button" onClick={leggTil} className="btn-soft btn-sm mt-3">
        + Legg til versjon
      </button>
    </div>
  );
}
