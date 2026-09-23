/**
 * Automatisk prisberegning for modellene i galleriet.
 *
 *   ((vekt × filamentpris) + (printtid × printerkostnad)) × profittfaktor
 *
 * Resultatet rundes til en butikkvennlig pris (39, 45, 49, 59 … 199, 249).
 */

export type Prisinnstillinger = {
  /** Kroner per gram filament – det plasten faktisk koster oss */
  filamentPerGram: number;
  /** Kroner per time printeren går */
  printerPerTime: number;
  /** Hvor mye vi ganger kostnaden med */
  profittfaktor: number;
};

export const STANDARD_PRISINNSTILLINGER: Prisinnstillinger = {
  filamentPerGram: 0.3,
  printerPerTime: 5,
  profittfaktor: 2.8,
};

function tall(v: unknown, fallback = 0): number {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

/** Gjør minutter om til timer. */
export function timerFra(minutter: unknown): number {
  return Math.max(0, tall(minutter)) / 60;
}

/** «4 t 35 min» ut fra antall minutter. */
export function tidTekst(minutter: unknown): string {
  const m = Math.max(0, Math.round(tall(minutter)));
  if (m <= 0) return 'ikke satt';
  const t = Math.floor(m / 60);
  const rest = m % 60;
  if (t === 0) return `${rest} min`;
  if (rest === 0) return `${t} t`;
  return `${t} t ${rest} min`;
}

/** Hva selve printen koster oss: plast + tid i printeren. */
export function beregnKostnad(vektGram: unknown, minutter: unknown, p: Prisinnstillinger): number {
  const vekt = Math.max(0, tall(vektGram));
  const timer = timerFra(minutter);
  const kost = vekt * p.filamentPerGram + timer * p.printerPerTime;
  return Math.round(kost * 100) / 100;
}

/** Råprisen, uten avrunding. */
export function beregnRapris(
  vektGram: unknown,
  minutter: unknown,
  p: Prisinnstillinger
): number {
  const vekt = Math.max(0, tall(vektGram));
  const timer = timerFra(minutter);
  const kost = vekt * p.filamentPerGram + timer * p.printerPerTime;
  const pris = kost * p.profittfaktor;
  return Number.isFinite(pris) && pris > 0 ? Math.round(pris * 100) / 100 : 0;
}

/** Prisene vi liker å selge til. */
function prisstige(): number[] {
  const under100 = [19, 25, 29, 35, 39, 45, 49, 55, 59, 65, 69, 75, 79, 85, 89, 95, 99];
  const hundre = [109, 119, 129, 139, 149, 159, 169, 179, 189, 199];
  const store = [219, 249, 279, 299, 329, 349, 379, 399, 449, 499];
  const storre = [549, 599, 649, 699, 749, 799, 849, 899, 949, 999];
  return [...under100, ...hundre, ...store, ...storre];
}

/**
 * Runder en råpris til nærmeste butikkvennlige pris.
 * Er det en pen pris rett under, tar vi den (99,68 → 99).
 * Ellers går vi opp til den neste (51,80 → 55).
 */
export function penPris(rapris: number): number {
  const raw = tall(rapris);
  if (raw <= 0) return 0;

  const stige = prisstige();

  // Over det stigen dekker: rund til nærmeste 50 og trekk fra 1
  if (raw > stige[stige.length - 1]) {
    return Math.max(999, Math.round(raw / 50) * 50 - 1);
  }

  // Er det en 9-pris rett under? Da tar vi den (99,68 → 99).
  const toleranse = Math.max(2, raw * 0.015);
  const under = [...stige].reverse().find((p) => p <= raw);
  if (under !== undefined && under % 10 === 9 && raw - under <= toleranse) return under;

  const over = stige.find((p) => p >= raw);
  if (over !== undefined) return over;
  return under ?? Math.round(raw);
}

export type Prisforslag = {
  /** Kan vi regne i det hele tatt? */
  kanBeregne: boolean;
  /** Hva mangler, hvis noe */
  mangler: 'vekt' | 'printtid' | null;
  /** Råprisen fra formelen */
  beregnet: number;
  /** Rundet til en pen pris */
  foreslatt: number;
  /** Hva printen koster oss */
  kostnad: number;
};

export function foreslaPris(
  vektGram: unknown,
  minutter: unknown,
  p: Prisinnstillinger
): Prisforslag {
  const vekt = tall(vektGram);
  const min = tall(minutter);

  if (vekt <= 0) {
    return { kanBeregne: false, mangler: 'vekt', beregnet: 0, foreslatt: 0, kostnad: 0 };
  }
  if (min <= 0) {
    return { kanBeregne: false, mangler: 'printtid', beregnet: 0, foreslatt: 0, kostnad: 0 };
  }

  const beregnet = beregnRapris(vekt, min, p);
  return {
    kanBeregne: true,
    mangler: null,
    beregnet,
    foreslatt: penPris(beregnet),
    kostnad: beregnKostnad(vekt, min, p),
  };
}

/** Leser prisinnstillingene fra innstillingene i admin. */
export function lesPrisinnstillinger(settings: Record<string, string>): Prisinnstillinger {
  return {
    filamentPerGram: tall(
      settings.pris_filament_gram,
      STANDARD_PRISINNSTILLINGER.filamentPerGram
    ) || STANDARD_PRISINNSTILLINGER.filamentPerGram,
    printerPerTime: tall(settings.pris_printer_time, STANDARD_PRISINNSTILLINGER.printerPerTime),
    profittfaktor:
      tall(settings.pris_profittfaktor, STANDARD_PRISINNSTILLINGER.profittfaktor) ||
      STANDARD_PRISINNSTILLINGER.profittfaktor,
  };
}

/** Formelen skrevet ut, til hjelpetekst i admin. */
export function formelTekst(p: Prisinnstillinger): string {
  return `((vekt i gram × ${p.filamentPerGram.toLocaleString('nb-NO')} kr) + (printtid i timer × ${p.printerPerTime.toLocaleString(
    'nb-NO'
  )} kr)) × ${p.profittfaktor.toLocaleString('nb-NO')}`;
}
