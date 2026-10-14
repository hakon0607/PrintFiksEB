/**
 * Dekselet er et vanlig produkt i galleriet – med ID «deksel». Produktsiden
 * viser dekselgeneratoren i stedet for «Legg i bestillingen».
 */
export const DEKSEL_KODE = 'deksel';

export function erDekselProdukt(p: { code?: string | null } | null | undefined): boolean {
  return (p?.code ?? '').trim().toLowerCase() === DEKSEL_KODE;
}

/** Laveste pris: grunnpris + én farge i motivet. */
export function dekselFraPris(grunnpris: number, perFarge: number): number {
  return Math.round(grunnpris + perFarge);
}
