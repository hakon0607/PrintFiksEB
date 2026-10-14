/**
 * «Én farge» på bilder: bildet gjøres om til en ren silhuett i én filamentfarge,
 * enten fylt eller som omriss. Resultatet er et skarpt bilde (bare farge eller
 * gjennomsiktig), så printet blir like rent som tekst.
 *
 * Bildet leses én gang i en håndterlig oppløsning, og ferdige varianter caches –
 * å flytte et lag rundt koster derfor ingenting.
 */
import type { BildeLag } from './lag';

const MAKS_SIDE = 900;
/** Strektykkelse for omriss i mm (≈ to linjer fra en 0,4 mm dyse). */
export const OMRISS_MM = 0.8;

type Grunnlag = { w: number; h: number; lys: Uint8Array; alfa: Uint8Array; harAlfa: boolean; auto: number };
const grunnlag = new WeakMap<HTMLImageElement, Grunnlag>();

function lesGrunnlag(el: HTMLImageElement): Grunnlag {
  const g = grunnlag.get(el);
  if (g) return g;
  const s = Math.min(1, MAKS_SIDE / Math.max(el.naturalWidth, el.naturalHeight));
  const w = Math.max(1, Math.round(el.naturalWidth * s));
  const h = Math.max(1, Math.round(el.naturalHeight * s));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(el, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const lys = new Uint8Array(w * h);
  const alfa = new Uint8Array(w * h);
  let gjennomsiktig = 0;
  const hist = new Uint32Array(256);
  for (let i = 0; i < w * h; i++) {
    const a = d[i * 4 + 3];
    alfa[i] = a;
    const l = Math.round(0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]);
    lys[i] = l;
    if (a < 128) gjennomsiktig++;
    else hist[l]++;
  }
  const ny: Grunnlag = { w, h, lys, alfa, harAlfa: gjennomsiktig > w * h * 0.03, auto: otsu(hist) };
  grunnlag.set(el, ny);
  return ny;
}

/** Otsus metode: terskelen som skiller lyst og mørkt best. */
function otsu(hist: Uint32Array): number {
  let total = 0, sum = 0;
  for (let i = 0; i < 256; i++) { total += hist[i]; sum += i * hist[i]; }
  if (!total) return 128;
  let sumB = 0, wB = 0, best = 0, terskel = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > best) { best = v; terskel = t; }
  }
  return terskel;
}

/** Standardverdien for «Mengde» (0–100) for dette bildet. */
export function autoMengde(el: HTMLImageElement): number {
  return Math.round((lesGrunnlag(el).auto / 255) * 100);
}

/** Erosjon med kvadratisk kjerne (radius r) – separabel, O(n). 1 = innenfor. */
function eroder(m: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const tmp = new Uint8Array(w * h);
  const ut = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let nuller = 0;
    const rad = y * w;
    // vindu [x-r, x+r]; utenfor bildet teller som 0
    for (let x = -r; x <= r; x++) if (x < 0 || x >= w || !m[rad + x]) nuller++;
    for (let x = 0; x < w; x++) {
      tmp[rad + x] = nuller === 0 ? 1 : 0;
      const ut1 = x - r, inn = x + r + 1;
      if (ut1 < 0 || !m[rad + ut1]) nuller--;
      if (inn >= w || !m[rad + inn]) nuller++;
    }
  }
  for (let x = 0; x < w; x++) {
    let nuller = 0;
    for (let y = -r; y <= r; y++) if (y < 0 || y >= h || !tmp[y * w + x]) nuller++;
    for (let y = 0; y < h; y++) {
      ut[y * w + x] = nuller === 0 ? 1 : 0;
      const ut1 = y - r, inn = y + r + 1;
      if (ut1 < 0 || !tmp[ut1 * w + x]) nuller--;
      if (inn >= h || !tmp[inn * w + x]) nuller++;
    }
  }
  return ut;
}

const lager = new Map<string, { canvas: HTMLCanvasElement; url: string }>();

function nokkel(l: BildeLag, hex: string, tPx: number) {
  return [l.url, hex, l.stil ?? 'fyll', l.mengde ?? 'auto', l.snu ? 1 : 0, l.stil === 'omriss' ? tPx : 0].join('|');
}

function lag(l: BildeLag, hex: string) {
  const g = lesGrunnlag(l.el);
  const tPx = Math.max(1, Math.round((OMRISS_MM * g.w) / Math.max(1, l.bredde)));
  const k = nokkel(l, hex, tPx);
  const fra = lager.get(k);
  if (fra) return fra;

  const n = g.w * g.h;
  const terskel = ((l.mengde ?? (g.auto / 255) * 100) / 100) * 255;
  let m = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    let inne = g.harAlfa ? g.alfa[i] >= 128 : g.lys[i] <= terskel;
    if (g.harAlfa && l.mengde != null) inne = inne && g.lys[i] <= terskel; // gjennomsiktig PNG: «Mengde» virker i tillegg
    if (l.snu) inne = !inne && (!g.harAlfa || g.alfa[i] >= 128);
    m[i] = inne ? 1 : 0;
  }
  if (l.stil === 'omriss') {
    const e = eroder(m, g.w, g.h, tPx);
    for (let i = 0; i < n; i++) m[i] = m[i] && !e[i] ? 1 : 0;
  }

  const c = document.createElement('canvas');
  c.width = g.w; c.height = g.h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(g.w, g.h);
  const r = parseInt(hex.slice(1, 3), 16), gg = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  for (let i = 0; i < n; i++) {
    if (!m[i]) continue;
    img.data[i * 4] = r; img.data[i * 4 + 1] = gg; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  m = new Uint8Array(0);
  const ut = { canvas: c, url: c.toDataURL('image/png') };
  lager.set(k, ut);
  if (lager.size > 40) lager.delete(lager.keys().next().value as string);
  return ut;
}

/** Silhuetten som canvas – brukes når printbildet regnes ut. */
export function enfarget(l: BildeLag, hex: string): HTMLCanvasElement {
  return lag(l, hex).canvas;
}
/** Silhuetten som bilde-URL – brukes i forhåndsvisningen. */
export function enfargetUrl(l: BildeLag, hex: string): string {
  return lag(l, hex).url;
}
