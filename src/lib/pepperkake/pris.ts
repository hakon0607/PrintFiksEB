/**
 * Pris på pepperkakeformer: etter areal (bredde × høyde av tegningen),
 * avrundet til nærmeste 5 kr. Standarden (7 × 7 cm) koster det som står
 * som pris på produktet i galleriet – endres der, som alle andre produkter.
 */
export const PEPPERKAKE_KODE = 'pepperkake';

/** Tegneflaten er 20 × 20 cm. */
export const MAKS_MM = 200;
/** Standardstørrelsen prisen på produktet gjelder for (cm²). */
export const STANDARD_CM2 = 7 * 7;
/** Minste tillatte størrelse (cm²). */
export const MIN_CM2 = 10;
/** Laveste pris (kr). */
export const MIN_PRIS = 5;
/** Brukes hvis produktet mangler pris. */
export const STANDARD_PRIS = 15;

export function erPepperkakeProdukt(p: { code?: string | null } | null | undefined): boolean {
  return (p?.code ?? '').trim().toLowerCase() === PEPPERKAKE_KODE;
}

/** Pris for en form med gitt areal (cm²), når 7 × 7 cm koster `standardPris`. */
export function pepperkakePris(arealCm2: number, standardPris = STANDARD_PRIS): number {
  const std = Number(standardPris) > 0 ? Number(standardPris) : STANDARD_PRIS;
  const raa = (Math.max(MIN_CM2, arealCm2) / STANDARD_CM2) * std;
  return Math.max(MIN_PRIS, Math.round(raa / 5) * 5);
}

/** «Fra»-prisen som vises i galleriet (minste størrelse). */
export function pepperkakeFraPris(standardPris = STANDARD_PRIS): number {
  return pepperkakePris(MIN_CM2, standardPris);
}

/** Bredde og høyde (mm) av tegningen. */
export function maal(punkter: [number, number][]): { bredde: number; hoyde: number; arealCm2: number } {
  if (!punkter.length) return { bredde: 0, hoyde: 0, arealCm2: 0 };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of punkter) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const bredde = x1 - x0, hoyde = y1 - y0;
  return { bredde, hoyde, arealCm2: (bredde / 10) * (hoyde / 10) };
}
