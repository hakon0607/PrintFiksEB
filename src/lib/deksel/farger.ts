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

/** «Hvit, Svart» → filament-id-er for selve dekselet. Tomt = alle farger. */
export function dekselFargerFra(tekst: string, filamenter: Filament[]): string[] {
  const navn = String(tekst ?? '').split(/[,\n]/).map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (!navn.length || navn.includes('alle')) return [];
  const ider = filamenter.filter((f) => navn.includes(f.navn.toLowerCase()) || navn.includes(f.id)).map((f) => f.id);
  return ider.length ? ider : [];
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

/**
 * Avstand der fargetone teller mer enn lyshet. Filamentene er sterke farger,
 * mens bilder ofte er dempet – med vanlig avstand ble alt grått eller svart.
 */
const VEKT_L = 0.5;
function avstand(a: [number, number, number], b: [number, number, number]) {
  const dl = a[0] - b[0], da = a[1] - b[1], db = a[2] - b[2];
  return VEKT_L * dl * dl + da * da + db * db;
}

/** Gjør fargene i bildet kraftigere (gråtoner røres ikke), før vi finner nærmeste filament. */
const FORSTERK = 1.8;
export function forsterk(l: [number, number, number]): [number, number, number] {
  const c = Math.hypot(l[1], l[2]);
  const k = 1 + (FORSTERK - 1) * Math.min(1, c / 12);
  return [l[0], l[1] * k, l[2] * k];
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
    ut.push({ lab: forsterk(tilLab(r, g, b)), vekt });
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
  antall: number,
  /** Farger som må være med (brukt i tekst, symboler og tegning). */
  faste: string[] = []
): string[] {
  const deksel = filamenter.find((f) => f.id === dekselId) ?? filamenter[0];
  const fast = faste.filter((id) => id !== deksel.id && filamenter.some((f) => f.id === id));
  if (fast.length >= antall) return fast;
  const andre = filamenter.filter((f) => f.id !== deksel.id && !fast.includes(f.id));
  const lab = new Map(filamenter.map((f) => [f.id, tilLab(...hexTilRgb(f.hex))] as const));
  const ekstra = antall - fast.length;
  let best: string[] = andre.slice(0, ekstra).map((f) => f.id);
  let bestFeil = Infinity;

  const kombinasjoner = (start: number, valgt: string[]) => {
    if (valgt.length === ekstra) {
      const sett = [deksel.id, ...fast, ...valgt].map((id) => lab.get(id)!);
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
  return [...fast, ...best];
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
  maske?: Uint8Array,
  skala = 0.25
): Uint8Array {
  const lab = palett.map((h) => tilLab(...hexTilRgb(h)));
  const kart = new Uint8Array(bredde * hoyde);
  const cache = new Map<number, number>();
  // nøyaktige filamentfarger (tekst, symboler, tegning) beholdes som de er
  palett.forEach((h, j) => {
    const [r, g, b] = hexTilRgb(h);
    if (!cache.has((r << 16) | (g << 8) | b)) cache.set((r << 16) | (g << 8) | b, j);
  });
  for (let i = 0; i < kart.length; i++) {
    if (maske && !maske[i]) continue;
    const o = i * 4;
    if (rgba[o + 3] < 128) continue;
    const k = (rgba[o] << 16) | (rgba[o + 1] << 8) | rgba[o + 2];
    let idx = cache.get(k);
    if (idx === undefined) {
      const l = forsterk(tilLab(rgba[o], rgba[o + 1], rgba[o + 2]));
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
  return rydd(kart, bredde, hoyde, maske, skala);
}

/**
 * Flertallsfilter (3×3) to ganger, og så fjernes småøyer under ~1 mm².
 * Skrevet uten Map-er, så det tåler kart på over én million piksler.
 */
export function rydd(kart: Uint8Array, b: number, h: number, maske?: Uint8Array, skala = 0.25): Uint8Array {
  let a = kart;
  const telle = new Int32Array(256);
  for (let runde = 0; runde < 2; runde++) {
    const ut = new Uint8Array(a);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < b - 1; x++) {
        const i = y * b + x;
        if (maske && !maske[i]) continue;
        const c = a[i];
        // rask vei: alle naboer like
        if (a[i - 1] === c && a[i + 1] === c && a[i - b] === c && a[i + b] === c &&
            a[i - b - 1] === c && a[i - b + 1] === c && a[i + b - 1] === c && a[i + b + 1] === c) continue;
        let bestV = c, bestN = 0;
        for (let dy = -b; dy <= b; dy += b)
          for (let dx = -1; dx <= 1; dx++) {
            const v = a[i + dy + dx];
            const n = ++telle[v];
            if (n > bestN) { bestN = n; bestV = v; }
          }
        for (let dy = -b; dy <= b; dy += b) for (let dx = -1; dx <= 1; dx++) telle[a[i + dy + dx]] = 0;
        if (bestN >= 5) ut[i] = bestV;
      }
    }
    a = ut;
  }
  // hårfine sprekker (≤ 0,2 mm) i dekselfarge mellom to motivfarger kan ikke printes – fyll dem
  for (let runde = 0; runde < 2; runde++) {
    const ut = new Uint8Array(a);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < b - 1; x++) {
        const i = y * b + x;
        if (a[i] !== 0 || (maske && !maske[i])) continue;
        const l = a[i - 1], r = a[i + 1], o = a[i - b], n = a[i + b];
        if (l && r) ut[i] = l;
        else if (o && n) ut[i] = o;
      }
    }
    a = ut;
  }
  // småøyer: flood fill, fyll med nabofargen
  const MIN = Math.max(4, Math.round(1 / (skala * skala))); // ≈ 1 mm²
  const sett = new Uint8Array(b * h);
  const ko = new Int32Array(b * h);
  for (let start = 0; start < a.length; start++) {
    if (sett[start]) continue;
    // også små hull i dekselfargen (0) inni motivet fylles – men aldri utenfor sonen
    const farge = a[start];
    let n = 0, hode = 0, nabo = 0;
    ko[n++] = start;
    sett[start] = 1;
    while (hode < n) {
      const i = ko[hode++];
      const x = i % b;
      if (x > 0) { const j = i - 1; if (a[j] === farge) { if (!sett[j]) { sett[j] = 1; ko[n++] = j; } } else nabo = a[j]; }
      if (x < b - 1) { const j = i + 1; if (a[j] === farge) { if (!sett[j]) { sett[j] = 1; ko[n++] = j; } } else nabo = a[j]; }
      if (i >= b) { const j = i - b; if (a[j] === farge) { if (!sett[j]) { sett[j] = 1; ko[n++] = j; } } else nabo = a[j]; }
      if (i < a.length - b) { const j = i + b; if (a[j] === farge) { if (!sett[j]) { sett[j] = 1; ko[n++] = j; } } else nabo = a[j]; }
    }
    let iSone = true;
    if (farge === 0 && maske) for (let k = 0; k < n && iSone; k++) if (!maske[ko[k]]) iSone = false;
    if (n < MIN && iSone) for (let k = 0; k < n; k++) a[ko[k]] = nabo;
  }
  return a;
}

/** Pris: grunnpris + per motivfarge. */
export function dekselPris(grunnpris: number, perFarge: number, antallFarger: number) {
  return Math.round(grunnpris + perFarge * antallFarger);
}
