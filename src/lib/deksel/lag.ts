/**
 * Motivet på dekselet består av lag: bilder, tekst, symboler og tegning.
 * Koordinater er mm sett utenfra (u mot høyre, v opp), samme som analysen.
 * Rotasjon er grader med klokka.
 */
import { cssFont } from './fonter';
import { symbol } from './symboler';
import { enfarget, OMRISS_MM } from './bildefarge';

/** Fylt eller bare omriss (for tekst, symboler og bilder i én farge). */
export type Stil = 'fyll' | 'omriss';

export type BildeLag = {
  id: string; type: 'bilde';
  el: HTMLImageElement; url: string; navn: string;
  u: number; v: number; bredde: number; rot: number;
  /** satt = «Én farge»: bildet blir en silhuett i denne filamentfargen */
  farge?: string;
  stil?: Stil;
  /** 0–100: hvor mye av bildet som blir farget (tom = automatisk) */
  mengde?: number;
  /** bytt om lyst og mørkt */
  snu?: boolean;
};
export type TekstLag = {
  id: string; type: 'tekst';
  tekst: string; font: string; farge: string;
  u: number; v: number; hoyde: number; rot: number;
  stil?: Stil;
};
export type SymbolLag = {
  id: string; type: 'symbol';
  symbol: string; farge: string;
  u: number; v: number; bredde: number; rot: number;
  stil?: Stil;
};
export type Strek = { farge: string; bredde: number; visk: boolean; punkter: [number, number][] };
export type TegningLag = { id: string; type: 'tegning'; du: number; dv: number; streker: Strek[] };

export type Lag = BildeLag | TekstLag | SymbolLag | TegningLag;

export const LINJEAVSTAND = 1.15;
/** Minste anbefalte teksthøyde (mm) – mindre blir utydelig i print. */
export const MIN_TEKST = 4;

let teller = 0;
export function nyId(): string {
  teller += 1;
  return `l${Date.now().toString(36)}${teller}`;
}

export function lagNavn(l: Lag): string {
  switch (l.type) {
    case 'bilde': return 'Bilde';
    case 'tekst': return l.tekst.trim().split('\n')[0].slice(0, 18) || 'Tekst';
    case 'symbol': return symbol(l.symbol).navn;
    case 'tegning': return 'Tegning';
  }
}

/** Størrelsen som skaleres (bredde for bilde/symbol, høyde for tekst). */
export function storrelse(l: Lag): number | null {
  if (l.type === 'tekst') return l.hoyde;
  if (l.type === 'bilde' || l.type === 'symbol') return l.bredde;
  return null;
}
export function medStorrelse<T extends Lag>(l: T, s: number): T {
  if (l.type === 'tekst') return { ...l, hoyde: Math.max(2, Math.min(80, s)) };
  if (l.type === 'bilde') return { ...l, bredde: Math.max(5, Math.min(400, s)) };
  if (l.type === 'symbol') return { ...l, bredde: Math.max(3, Math.min(200, s)) };
  return l;
}

/** Strektykkelse (mm) når tekst vises som omriss. */
export function tekstOmriss(hoyde: number) {
  return Math.max(0.6, Math.min(1.4, hoyde * 0.07));
}

/** Fargene (filament-id) laget bruker – bilder i full farge har ingen faste farger. */
export function fargerI(l: Lag): string[] {
  if (l.type === 'tekst' || l.type === 'symbol') return [l.farge];
  if (l.type === 'bilde') return l.farge ? [l.farge] : [];
  if (l.type === 'tegning') return l.streker.filter((s) => !s.visk).map((s) => s.farge);
  return [];
}

export function sentrum(l: Lag): [number, number] {
  if (l.type !== 'tegning') return [l.u, l.v];
  const pts = l.streker.flatMap((s) => s.punkter);
  if (!pts.length) return [l.du, l.dv];
  const us = pts.map((p) => p[0]), vs = pts.map((p) => p[1]);
  return [(Math.min(...us) + Math.max(...us)) / 2 + l.du, (Math.min(...vs) + Math.max(...vs)) / 2 + l.dv];
}

export function flyttet<T extends Lag>(l: T, du: number, dv: number): T {
  if (l.type === 'tegning') return { ...l, du: l.du + du, dv: l.dv + dv };
  return { ...l, u: (l as BildeLag).u + du, v: (l as BildeLag).v + dv };
}

/** SVG-sti for en strek, glattet med kvadratiske kurver. Punkter i visning (v opp). */
export function strekSti(p: [number, number][]): string {
  if (!p.length) return '';
  const y = (v: number) => -v;
  if (p.length === 1) return `M${p[0][0]} ${y(p[0][1])}l0.01 0`;
  let d = `M${p[0][0].toFixed(2)} ${y(p[0][1]).toFixed(2)}`;
  for (let i = 1; i < p.length - 1; i++) {
    const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2;
    d += `Q${p[i][0].toFixed(2)} ${y(p[i][1]).toFixed(2)} ${mx.toFixed(2)} ${y(my).toFixed(2)}`;
  }
  const s = p[p.length - 1];
  return d + `L${s[0].toFixed(2)} ${y(s[1]).toFixed(2)}`;
}

/**
 * Tegner alle lagene på et canvas som allerede er satt opp i mm med v opp.
 * Gjennomsiktig = dekselfarge. Viskelær fjerner det som ligger under.
 */
export function tegnLag(ctx: CanvasRenderingContext2D, lag: Lag[], hex: (id: string) => string) {
  for (const l of lag) {
    ctx.save();
    if (l.type === 'tegning') {
      ctx.translate(l.du, l.dv);
      ctx.scale(1, -1); // stiene er laget med y ned
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const s of l.streker) {
        ctx.globalCompositeOperation = s.visk ? 'destination-out' : 'source-over';
        ctx.strokeStyle = s.visk ? '#000' : hex(s.farge);
        ctx.lineWidth = s.bredde;
        ctx.stroke(new Path2D(strekSti(s.punkter)));
      }
      ctx.restore();
      continue;
    }
    ctx.translate(l.u, l.v);
    ctx.rotate((-l.rot * Math.PI) / 180);
    ctx.scale(1, -1); // herfra: y ned, som i SVG
    if (l.type === 'bilde') {
      const h = l.bredde * (l.el.naturalHeight / l.el.naturalWidth);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(l.farge ? enfarget(l, hex(l.farge)) : l.el, -l.bredde / 2, -h / 2, l.bredde, h);
    } else if (l.type === 'symbol') {
      const s = symbol(l.symbol);
      const k = l.bredde / 24;
      ctx.scale(k, k);
      ctx.translate(-12, -12);
      if (l.stil === 'omriss') {
        ctx.strokeStyle = hex(l.farge);
        ctx.lineWidth = OMRISS_MM / k;
        ctx.lineJoin = 'round';
        ctx.stroke(new Path2D(s.d));
      } else {
        ctx.fillStyle = hex(l.farge);
        ctx.fill(new Path2D(s.d), s.regel);
      }
    } else if (l.type === 'tekst') {
      // tegn i 10× størrelse – noen nettlesere runder av veldig små fonter
      ctx.scale(0.1, 0.1);
      const h = l.hoyde * 10;
      ctx.font = cssFont(l.font, h);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const linjer = l.tekst.split('\n');
      const y = (i: number) => (i - (linjer.length - 1) / 2) * LINJEAVSTAND * h;
      if (l.stil === 'omriss') {
        ctx.strokeStyle = hex(l.farge);
        ctx.lineWidth = tekstOmriss(l.hoyde) * 10;
        ctx.lineJoin = 'round';
        linjer.forEach((t, i) => ctx.strokeText(t, 0, y(i)));
      } else {
        ctx.fillStyle = hex(l.farge);
        linjer.forEach((t, i) => ctx.fillText(t, 0, y(i)));
      }
    }
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';
}
