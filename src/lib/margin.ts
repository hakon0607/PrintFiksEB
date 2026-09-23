import type { Material } from './types';

export type Margin = {
  /** Gram plast i modellen */
  vekt: number;
  /** Kroner per gram for materialet */
  perGram: number;
  /** Plastkostnaden */
  materialkost: number;
  /** Ekstra ting: metallring, tape, emballasje ... */
  ekstra: number;
  /** Har dere satt kostprisen selv? */
  egenKostpris: boolean;
  /** Alt det koster oss å lage én */
  kost: number;
  /** Det kunden betaler */
  pris: number;
  /** Det vi sitter igjen med */
  overskudd: number;
  /** Overskudd i prosent av prisen */
  prosent: number | null;
  /** Fant vi materialet i prislisten? */
  kjentMateriale: boolean;
};

function tall(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Regner ut hva en modell koster oss og hvor mye vi tjener på den.
 * Materialprisen hentes fra prislisten, så den følger med hvis dere endrer den.
 */
export function regnMargin(
  rad: {
    price?: unknown;
    weight_g?: unknown;
    material?: unknown;
    cost_extra?: unknown;
    cost_price?: unknown;
  },
  materialer: Material[]
): Margin {
  const navn = String(rad.material ?? '').trim().toLowerCase();
  const treff = materialer.find((m) => m.name.trim().toLowerCase() === navn);
  const perGram = treff ? tall(treff.price_per_gram) : 0;
  const vekt = tall(rad.weight_g);
  const egen = tall(rad.cost_price);
  const egenKostpris = egen > 0;
  // Har dere skrevet inn hva den faktisk koster, bruker vi det i stedet for regnestykket
  const materialkost = egenKostpris ? egen : vekt * perGram;
  const ekstra = tall(rad.cost_extra);
  const kost = materialkost + ekstra;
  const pris = tall(rad.price);
  const overskudd = pris - kost;
  return {
    egenKostpris,
    vekt,
    perGram,
    materialkost,
    ekstra,
    kost,
    pris,
    overskudd,
    prosent: pris > 0 ? (overskudd / pris) * 100 : null,
    kjentMateriale: Boolean(treff),
  };
}
