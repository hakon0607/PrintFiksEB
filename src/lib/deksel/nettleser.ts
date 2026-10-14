/**
 * Det admin trenger i nettleseren: analysere en opplastet dekselfil, og lage
 * printfila fra en bestilling. Alt skjer lokalt – ingen tunge serverkall.
 */
import { lastManifold } from './manifold-nettleser';
import { lesModell, type Lest } from './mesh';
import { analyser, type Analyse } from './analyse';
import { lag3mf, lagDeler, lagStlPakke, type Design, type Resultat } from './generer';
import { hexTilRgb } from './farger';

export async function analyserFil(fil: File): Promise<{ analyse: Analyse; lest: Lest }> {
  const data = new Uint8Array(await fil.arrayBuffer());
  const lest = lesModell(data, fil.name);
  const wasm = await lastManifold();
  return { analyse: analyser(wasm, lest.deler), lest };
}

async function hentBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Klarte ikke å hente ${url.split('/').pop()} (${res.status}).`);
  return new Uint8Array(await res.arrayBuffer());
}

/** PNG-fargekartet tilbake til tall: 0 = dekselfarge, 1.. = motivfargene. */
export async function lesDesign(
  bildeUrl: string,
  farger: { navn: string; hex: string }[],
  ramme: { u0: number; v0: number; skala: number; bredde: number; hoyde: number }
): Promise<Design> {
  const blob = await (await fetch(bildeUrl, { cache: 'no-store' })).blob();
  const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const c = document.createElement('canvas');
  c.width = ramme.bredde;
  c.height = ramme.hoyde;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bmp, 0, 0, ramme.bredde, ramme.hoyde);
  const rgba = ctx.getImageData(0, 0, ramme.bredde, ramme.hoyde).data;
  const rgb = farger.map((f) => hexTilRgb(f.hex));
  const kart = new Uint8Array(ramme.bredde * ramme.hoyde);
  for (let i = 0; i < kart.length; i++) {
    if (rgba[i * 4 + 3] < 128) continue;
    let best = 1, min = Infinity;
    for (let k = 1; k < rgb.length; k++) {
      const d = (rgba[i * 4] - rgb[k][0]) ** 2 + (rgba[i * 4 + 1] - rgb[k][1]) ** 2 + (rgba[i * 4 + 2] - rgb[k][2]) ** 2;
      if (d < min) { min = d; best = k; }
    }
    kart[i] = best;
  }
  return { kart, bredde: ramme.bredde, hoyde: ramme.hoyde, skala: ramme.skala, u0: ramme.u0, v0: ramme.v0, farger };
}

let prosjektMal: Record<string, unknown> | null = null;
async function standardProsjekt() {
  if (!prosjektMal) prosjektMal = await (await fetch('/deksel/bambu-prosjekt.json')).json();
  return prosjektMal!;
}

export type Printfiler = { tremf: Blob; stl: Blob; resultat: Resultat };

export async function lagPrintfiler(opts: {
  modellUrl: string;
  modellFilnavn: string;
  analyse: Analyse;
  design: Design;
  tittel: string;
}): Promise<Printfiler> {
  const wasm = await lastManifold();
  const lest = lesModell(await hentBytes(opts.modellUrl), opts.modellFilnavn);
  const resultat = lagDeler(wasm, lest, opts.analyse, opts.design);
  const andre = lest.deler.filter((_, i) => i !== opts.analyse.kasseDel).map((d) => d.nett);
  const mal = lest.prosjekt ?? (await standardProsjekt());
  const tremf = lag3mf(resultat, andre, mal, opts.tittel);
  const stl = lagStlPakke(resultat, andre);
  return {
    tremf: new Blob([tremf as BlobPart], { type: 'model/3mf' }),
    stl: new Blob([stl as BlobPart], { type: 'application/zip' }),
    resultat,
  };
}

/** En enkel testdesign: sirkel + stripe, så dere kan sjekke en ny modell i Bambu Studio. */
export function testDesign(a: Analyse, farger: { navn: string; hex: string }[]): Design {
  const skala = 0.25;
  const us = a.silhuett.map((p) => p[0]);
  const vs = a.silhuett.map((p) => p[1]);
  const u0 = Math.min(...us), v0 = Math.max(...vs);
  const bredde = Math.ceil(a.bredde / skala), hoyde = Math.ceil(a.hoyde / skala);
  const kart = new Uint8Array(bredde * hoyde);
  const r = Math.min(a.bredde, a.hoyde) * 0.27;
  for (let j = 0; j < hoyde; j++)
    for (let i = 0; i < bredde; i++) {
      const u = u0 + (i + 0.5) * skala, v = v0 - (j + 0.5) * skala;
      if (u * u + v * v < r * r) kart[j * bredde + i] = 1;
      if (farger.length > 2 && v < -a.hoyde * 0.28 && v > -a.hoyde * 0.36) kart[j * bredde + i] = 2;
    }
  return { kart, bredde, hoyde, skala, u0, v0, farger };
}

export function lastNed(blob: Blob, filnavn: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filnavn;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function filnavn(s: string) {
  return s
    .toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
