/**
 * Pris på pepperkakeformer: etter hvor lang streken er (det er den som
 * bestemmer hvor mye plast og printetid formen tar).
 *
 *   pris = startpris + pris per cm × lengden av streken
 *
 * avrundet til nærmeste 5 kr (kan endres), og aldri under minsteprisen.
 * Alle tallene endres i Admin → Priser → «Pepperkakeform».
 */
import type { Pkt } from './sti';

export const PEPPERKAKE_KODE = 'pepperkake';

/** Tegneflaten er 20 × 20 cm. */
export const MAKS_MM = 200;
/** Minste tillatte størrelse (cm²) – så formen blir sterk nok og lett å bruke. */
export const MIN_CM2 = 10;

export type PepperkakeOppsett = {
  /** kr per form uansett størrelse */
  startpris: number;
  /** kr per cm strek */
  prisPerCm: number;
  /** laveste pris (kr) */
  minstepris: number;
  /** rund av til nærmeste … kr (1 = ingen avrunding) */
  avrunding: number;
};

/** Standardverdiene – billig, men dekker plast og printetid. */
export const STANDARD_OPPSETT: PepperkakeOppsett = {
  startpris: 5,
  prisPerCm: 0.4,
  minstepris: 15,
  avrunding: 5,
};

/** Innstillingene som styrer prisen (gruppe «Pepperkakeform» i Priser). */
export const OPPSETT_NOKLER = {
  startpris: 'pepperkake_startpris',
  prisPerCm: 'pepperkake_pris_per_cm',
  minstepris: 'pepperkake_minstepris',
  avrunding: 'pepperkake_avrunding',
} as const;

function tall(v: unknown, reserve: number, min = 0): number {
  if (v === undefined || v === null || v === '') return reserve;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) && n >= min ? n : reserve;
}

/** Leser prisoppsettet fra innstillingene (key → value). */
export function oppsettFra(settings: Record<string, string | null | undefined>): PepperkakeOppsett {
  const s = STANDARD_OPPSETT;
  return {
    startpris: tall(settings[OPPSETT_NOKLER.startpris], s.startpris),
    prisPerCm: tall(settings[OPPSETT_NOKLER.prisPerCm], s.prisPerCm),
    minstepris: tall(settings[OPPSETT_NOKLER.minstepris], s.minstepris),
    avrunding: Math.max(1, tall(settings[OPPSETT_NOKLER.avrunding], s.avrunding, 1)),
  };
}

export function erPepperkakeProdukt(p: { code?: string | null } | null | undefined): boolean {
  return (p?.code ?? '').trim().toLowerCase() === PEPPERKAKE_KODE;
}

/** Lengden av streken i cm (med den siste biten hvis formen er lukket). */
export function strekLengdeCm(punkter: Pkt[], lukket: boolean): number {
  let s = 0;
  for (let i = 1; i < punkter.length; i++) s += Math.hypot(punkter[i][0] - punkter[i - 1][0], punkter[i][1] - punkter[i - 1][1]);
  if (lukket && punkter.length > 2) {
    const a = punkter[0], b = punkter[punkter.length - 1];
    s += Math.hypot(a[0] - b[0], a[1] - b[1]);
  }
  return s / 10;
}

/** Pris for en strek på `lengdeCm` cm. */
export function pepperkakePris(lengdeCm: number, o: PepperkakeOppsett = STANDARD_OPPSETT): number {
  const raa = o.startpris + o.prisPerCm * Math.max(0, lengdeCm);
  const rundet = Math.round(raa / o.avrunding) * o.avrunding;
  return Math.max(o.minstepris, Math.round(rundet)); // alltid hele kroner
}

/** «Fra»-prisen som vises i galleriet. */
export function pepperkakeFraPris(o: PepperkakeOppsett = STANDARD_OPPSETT): number {
  return pepperkakePris(0, o);
}

export const krTekst = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ','));

/** «5 kr + 0,40 kr per cm strek, rundet til nærmeste 5 kr (minst 10 kr)» */
export function prisForklaring(o: PepperkakeOppsett) {
  const deler = [
    o.startpris > 0 ? `${krTekst(o.startpris)} kr + ` : '',
    `${krTekst(o.prisPerCm)} kr per cm strek`,
    o.avrunding > 1 ? `, rundet til nærmeste ${krTekst(o.avrunding)} kr` : '',
    o.minstepris > 0 ? ` (minst ${krTekst(o.minstepris)} kr)` : '',
  ];
  return `Prisen følger hvor lang streken er: ${deler.join('')}.`;
}

/** Bredde og høyde (mm) av tegningen. */
export function maal(punkter: Pkt[]): { bredde: number; hoyde: number; arealCm2: number } {
  if (!punkter.length) return { bredde: 0, hoyde: 0, arealCm2: 0 };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of punkter) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const bredde = x1 - x0, hoyde = y1 - y0;
  return { bredde, hoyde, arealCm2: (bredde / 10) * (hoyde / 10) };
}
