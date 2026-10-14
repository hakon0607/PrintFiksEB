/**
 * Filamentfargene og hvordan et bilde gjøres om til dem.
 * Rene funksjoner – brukes både av kunden (forhåndsvisning) og i admin.
 */

export type Filament = { id: string; navn: string; hex: string };

/** Standardfargene. Kan overstyres i admin under Priser (deksel_farger). */
export const STANDARD_FILAMENTER: Filament[] = [
  { id: 'hvit', navn: 'Hvit', hex: '#F4F4F1' },
  { id: 'svart', navn: 'Svart', hex: '#1B1B1D' },
  { id: 'gra', navn: 'Grå', hex: '#8E9089' },
  { id: 'bla', navn: 'Blå', hex: '#1E4DB7' },
  { id: 'rod', navn: 'Rød', hex: '#C62A2F' },
  { id: 'gronn', navn: 'Grønn', hex: '#1E9E4A' },
  { id: 'gul', navn: 'Gul', hex: '#F2D21B' },
];

/** «Hvit #F4F4F1» per linje → liste. Ugyldige linjer hoppes over. */
export function lesFilamenter(tekst: string | null | undefined): Filament[] {
  const linjer = String(tekst ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const ut: Filament[] = [];
  for (const l of linjer) {
    const m = l.match(/^(.+?)\s*[:=]?\s*(#[0-9a-f]{6})$/i);
    if (!m) continue;
    const navn = m[1].trim();
    ut.push({ id: navn.toLowerCase().replace(/[^a-zæøå0-9]+/g, '-'), navn, hex: m[2].toUpperCase() });
  }
  return ut.length >= 2 ? ut : STANDARD_FILAMENTER;
}

export function hexTilRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** sRGB → CIELAB, så avstander ligner det øyet ser. */
export function tilLab(r: number, g: number, b: number): [number, number, number] {
  const lin = (c: number) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const R = lin(r), G = lin(g), B = lin(b);
  let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  let y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  let z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = f(x); y = f(y); z = f(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function avstand(a: [number, number, number], b: [number, number, number]) {
  const dl = a[0] - b[0], da = a[1] - b[1], db = a[2] - b[2];
  return dl * dl + da * da + db * db;
}

type Utvalg = { lab: [number, number, number]; vekt: number }[];

/**
 * Tar et utvalg av pikslene (gjennomsiktige og utenfor sonen er hoppet over),
 * og grupperer like farger så beregningene går fort.
 */
export function utvalg(rgba: Uint8ClampedArray, maske?: Uint8Array): Utvalg {
  const boks = new Map<number, number>();
  for (let i = 0; i < rgba.length; i += 4) {
    if (maske && !maske[i / 4]) continue;
    if (rgba[i + 3] < 128) continue;
    const k = ((rgba[i] >> 3) << 10) | ((rgba[i + 1] >> 3) << 5) | (rgba[i + 2] >> 3);
    boks.set(k, (boks.get(k) ?? 0) + 1);
  }
  const ut: Utvalg = [];
  boks.forEach((vekt, k) => {
    const r = ((k >> 10) & 31) * 8 + 4, g = ((k >> 5) & 31) * 8 + 4, b = (k & 31) * 8 + 4;
    ut.push({ lab: tilLab(r, g, b), vekt });
  });
  return ut;
}

/**
 * Velger de `antall` filamentfargene som sammen med dekselfargen gjengir
 * bildet best. Prøver alle kombinasjoner – det er bare noen titalls.
 */
export function velgFarger(
  pr: Utvalg,
  filamenter: Filament[],
  dekselId: string,
  antall: number
): string[] {
  const deksel = filamenter.find((f) => f.id === dekselId) ?? filamenter[0];
  const andre = filamenter.filter((f) => f.id !== deksel.id);
  const lab = new Map(filamenter.map((f) => [f.id, tilLab(...hexTilRgb(f.hex))] as const));
  let best: string[] = andre.slice(0, antall).map((f) => f.id);
  let bestFeil = Infinity;

  const kombinasjoner = (start: number, valgt: string[]) => {
    if (valgt.length === antall) {
      const sett = [deksel.id, ...valgt].map((id) => lab.get(id)!);
      let feil = 0;
      for (const p of pr) {
        let min = Infinity;
        for (const c of sett) min = Math.min(min, avstand(p.lab, c));
        // lineær ΔE (ikke kvadrert): da får store, tydelige flater riktig farge,
        // i stedet for at én «mellomfarge» (grå) vinner fordi den er middels nær alt
        feil += Math.sqrt(min) * p.vekt;
      }
      if (feil < bestFeil) { bestFeil = feil; best = [...valgt]; }
      return;
    }
    for (let i = start; i < andre.length; i++) kombinasjoner(i + 1, [...valgt, andre[i].id]);
  };
  kombinasjoner(0, []);
  return best;
}

/**
 * Gjør bildet om til en fargekart: 0 = dekselfarge (ingenting legges inn),
 * 1..n = motivfargene. Gjennomsiktig og utenfor sonen blir 0.
 * Etterpå rydder vi bort enkeltpiksler som ikke lar seg printe.
 */
export function posteriser(
  rgba: Uint8ClampedArray,
  bredde: number,
  hoyde: number,
  palett: string[], // hex, [dekselfarge, motivfarge1, …]
  maske?: Uint8Array
): Uint8Array {
  const lab = palett.map((h) => tilLab(...hexTilRgb(h)));
  const kart = new Uint8Array(bredde * hoyde);
  const cache = new Map<number, number>();
  for (let i = 0; i < kart.length; i++) {
    if (maske && !maske[i]) continue;
    const o = i * 4;
    if (rgba[o + 3] < 128) continue;
    const k = (rgba[o] << 16) | (rgba[o + 1] << 8) | rgba[o + 2];
    let idx = cache.get(k);
    if (idx === undefined) {
      const l = tilLab(rgba[o], rgba[o + 1], rgba[o + 2]);
      let min = Infinity;
      idx = 0;
      lab.forEach((c, j) => {
        const d = avstand(l, c);
        if (d < min) { min = d; idx = j; }
      });
      cache.set(k, idx);
    }
    kart[i] = idx;
  }
  return rydd(kart, bredde, hoyde, maske);
}

/** Flertallsfilter (3×3) to ganger, og så fjernes småøyer under ~1 mm². */
export function rydd(kart: Uint8Array, b: number, h: number, maske?: Uint8Array): Uint8Array {
  let a = kart;
  for (let runde = 0; runde < 2; runde++) {
    const ut = new Uint8Array(a);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < b - 1; x++) {
        const i = y * b + x;
        if (maske && !maske[i]) continue;
        const telle = new Map<number, number>();
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const v = a[i + dy * b + dx];
            telle.set(v, (telle.get(v) ?? 0) + 1);
          }
        let bestV = a[i], bestN = 0;
        telle.forEach((n, v) => { if (n > bestN) { bestN = n; bestV = v; } });
        if (bestN >= 5) ut[i] = bestV;
      }
    }
    a = ut;
  }
  // småøyer: flood fill, fyll med nabofargen
  const MIN = 16; // piksler (0,25 mm → 1 mm²)
  const sett = new Int32Array(b * h).fill(-1);
  const ko = new Int32Array(b * h);
  for (let start = 0; start < a.length; start++) {
    if (sett[start] !== -1 || a[start] === 0) continue;
    const farge = a[start];
    let n = 0, hode = 0;
    ko[n++] = start;
    sett[start] = start;
    let nabo = 0;
    while (hode < n) {
      const i = ko[hode++];
      const x = i % b, y = (i / b) | 0;
      const nb = [x > 0 ? i - 1 : -1, x < b - 1 ? i + 1 : -1, y > 0 ? i - b : -1, y < h - 1 ? i + b : -1];
      for (const j of nb) {
        if (j < 0) continue;
        if (a[j] === farge) {
          if (sett[j] === -1) { sett[j] = start; ko[n++] = j; }
        } else nabo = a[j];
      }
    }
    if (n < MIN) for (let k = 0; k < n; k++) a[ko[k]] = nabo;
  }
  return a;
}

/** Pris: grunnpris + per motivfarge. */
export function dekselPris(grunnpris: number, perFarge: number, antallFarger: number) {
  return Math.round(grunnpris + perFarge * antallFarger);
}
