/**
 * Finner baksiden på et deksel helt av seg selv: omrisset, kamerahullet,
 * hvor tykk baksiden er, og en trygg sone der motivet kan ligge uten å
 * komme borti kanter og hull. Dere laster bare opp fila.
 */
import type { CrossSection, ManifoldToplevel } from 'manifold-3d';
import { grenser, type Del, type Nett } from './mesh';

export type Ring = [number, number][];

export type Analyse = {
  versjon: 1;
  /** Hvilken del av fila som er selve dekselet (de andre tas med uendret). */
  kasseDel: number;
  /** platekoordinater (x,y) → visning sett utenfra (u,v), mm. u = a·x + b·y + c, v = d·x + e·y + f */
  tilVisning: [number, number, number, number, number, number];
  /** Ytterkanten av dekselet sett bakfra (den bredeste delen), i visning. */
  silhuett: Ring;
  /** Hull i baksiden (kamera osv.), i visning. */
  hull: Ring[];
  /** Der motivet kan ligge. Liste med polygoner: [ytterkant, ...hull]. */
  trygg: Ring[][];
  bredde: number;
  hoyde: number;
  /** Baksidens tykkelse (mm) og hvor dypt motivet legges inn. */
  tykkelse: number;
  dybde: number;
  /** Trekantantall – bare til info i admin. */
  trekanter: number;
};

const KANTAVSTAND = 2.2; // mm fra kanter og hull
const LAG = 0.2;

/** Snitt av nettet i høyde z → lukkede ringer (platekoordinater). */
export function snitt(nett: Nett, z: number): Ring[] {
  const p = nett.punkter;
  const t = nett.trekanter;
  const segmenter: [number, number, number, number][] = [];
  for (let i = 0; i < t.length; i += 3) {
    const a = t[i] * 3, b = t[i + 1] * 3, c = t[i + 2] * 3;
    const pts = [a, b, c];
    const kryss: [number, number][] = [];
    for (let k = 0; k < 3; k++) {
      const p1 = pts[k], p2 = pts[(k + 1) % 3];
      const z1 = p[p1 + 2] - z, z2 = p[p2 + 2] - z;
      if ((z1 < 0 && z2 >= 0) || (z1 >= 0 && z2 < 0)) {
        const s = z1 / (z1 - z2);
        kryss.push([p[p1] + s * (p[p2] - p[p1]), p[p1 + 1] + s * (p[p2 + 1] - p[p1 + 1])]);
      }
    }
    if (kryss.length === 2) segmenter.push([kryss[0][0], kryss[0][1], kryss[1][0], kryss[1][1]]);
  }
  // kjed segmentene sammen til ringer
  const nokkel = (x: number, y: number) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)}`;
  const fra = new Map<string, number[]>();
  segmenter.forEach((s, i) => {
    for (const k of [nokkel(s[0], s[1]), nokkel(s[2], s[3])]) {
      if (!fra.has(k)) fra.set(k, []);
      fra.get(k)!.push(i);
    }
  });
  const brukt = new Uint8Array(segmenter.length);
  const ringer: Ring[] = [];
  for (let start = 0; start < segmenter.length; start++) {
    if (brukt[start]) continue;
    brukt[start] = 1;
    const s0 = segmenter[start];
    const ring: Ring = [[s0[0], s0[1]], [s0[2], s0[3]]];
    let ende = nokkel(s0[2], s0[3]);
    const forste = nokkel(s0[0], s0[1]);
    for (let guard = 0; guard < segmenter.length; guard++) {
      if (ende === forste) break;
      const kandidater = fra.get(ende) ?? [];
      const neste = kandidater.find((j) => !brukt[j]);
      if (neste === undefined) break;
      brukt[neste] = 1;
      const s = segmenter[neste];
      const kA = nokkel(s[0], s[1]);
      const [nx, ny] = kA === ende ? [s[2], s[3]] : [s[0], s[1]];
      ring.push([nx, ny]);
      ende = nokkel(nx, ny);
    }
    if (ring.length >= 4) ringer.push(ring);
  }
  return ringer;
}

export function areal(r: Ring): number {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i];
    const [x2, y2] = r[(i + 1) % r.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

function tyngdepunkt(r: Ring): [number, number] {
  let x = 0, y = 0;
  for (const p of r) { x += p[0]; y += p[1]; }
  return [x / r.length, y / r.length];
}

function region(wasm: ManifoldToplevel, ringer: Ring[]): CrossSection {
  return wasm.CrossSection.ofPolygons(ringer, 'EvenOdd');
}

function mat3(m: Analyse['tilVisning']) {
  const [a, b, c, d, e, f] = m;
  return [a, d, 0, b, e, 0, c, f, 1] as unknown as Parameters<CrossSection['transform']>[0];
}

export function invers(m: Analyse['tilVisning']): Analyse['tilVisning'] {
  const [a, b, c, d, e, f] = m;
  const det = a * e - b * d;
  const ia = e / det, ib = -b / det, id = -d / det, ie = a / det;
  return [ia, ib, -(ia * c + ib * f), id, ie, -(id * c + ie * f)];
}

function avrund(cs: CrossSection): Ring[] {
  return cs
    .simplify(0.04)
    .toPolygons()
    .map((r) => r.map((p) => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100] as [number, number]));
}

/** Grupperer ringer til polygoner: ytterkant (mot klokka) + hullene inni. */
function somPolygoner(ringer: Ring[]): Ring[][] {
  const ytre = ringer.filter((r) => areal(r) > 0);
  const indre = ringer.filter((r) => areal(r) < 0);
  const inni = (pt: [number, number], r: Ring) => {
    let inn = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j];
      if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inn = !inn;
    }
    return inn;
  };
  return ytre.map((y) => [y, ...indre.filter((h) => inni(h[0], y))]);
}

export function analyser(wasm: ManifoldToplevel, deler: Del[]): Analyse {
  if (!deler.length) throw new Error('Fila inneholder ingen modeller.');

  // dekselet = delen med størst fotavtrykk på plata
  let kasseDel = 0, best = -1;
  deler.forEach((d, i) => {
    const g = grenser(d.nett);
    const a = (g.maks[0] - g.min[0]) * (g.maks[1] - g.min[1]);
    if (a > best) { best = a; kasseDel = i; }
  });
  const nett = deler[kasseDel].nett;
  const g = grenser(nett);
  if (g.min[2] > 0.05 || g.min[2] < -0.05) {
    throw new Error('Dekselet ligger ikke på plata. Legg baksiden ned i Bambu Studio og eksporter på nytt.');
  }

  // baksiden helt nede
  const bunn = region(wasm, snitt(nett, 0.05));
  const bunnAreal = bunn.area();
  const fot = (g.maks[0] - g.min[0]) * (g.maks[1] - g.min[1]);
  if (bunnAreal < fot * 0.5) {
    throw new Error(
      'Fant ingen flat bakside nede på plata. Legg dekselet med baksiden ned i Bambu Studio og eksporter på nytt.'
    );
  }

  // tykkelse: der snittarealet faller under halvparten
  let tykkelse = 0;
  for (let z = 0.15; z < Math.min(4, g.maks[2]); z += 0.1) {
    const a = region(wasm, snitt(nett, z)).area();
    if (a < bunnAreal * 0.5) { tykkelse = Math.round((z - 0.05) * 100) / 100; break; }
  }
  if (!tykkelse) tykkelse = 1;
  // dypt nok til å dekke godt, men minst 0,4 mm igjen bak
  const dybde = Math.max(LAG * 2, Math.min(0.6, Math.floor((tykkelse - 0.4 + 1e-6) / LAG) * LAG));

  // hull og kamera (for å finne «opp»)
  const bunnRinger = bunn.toPolygons() as Ring[];
  const hullPlate = bunnRinger.filter((r) => areal(r) < 0).sort((a, b) => areal(a) - areal(b));
  // silhuett: sett alle snittene oppå hverandre – sideveggene har åpninger for
  // knapper, så ett enkelt snitt gir ikke hele ytterkanten
  let samlet = bunn;
  for (let k = 1; k <= 6; k++) {
    const z = (g.maks[2] * k) / 7;
    const r = snitt(nett, z);
    if (r.length) samlet = wasm.CrossSection.union(samlet, region(wasm, r));
  }
  const silhuettSnitt = samlet.offset(0.01).offset(-0.01);
  const silRinger = (silhuettSnitt.toPolygons() as Ring[]).filter((r) => areal(r) > 0);
  silRinger.sort((a, b) => areal(b) - areal(a));
  const silhuettPlate = silRinger[0] ?? bunnRinger.filter((r) => areal(r) > 0)[0];

  // sett utenfra = speilet x. Så roterer vi så langsiden står opp og kameraet er øverst.
  const cx = (g.min[0] + g.maks[0]) / 2;
  const cy = (g.min[1] + g.maks[1]) / 2;
  const liggende = g.maks[0] - g.min[0] > g.maks[1] - g.min[1];
  // grunnform: u0 = -(x-cx), v0 = (y-cy)
  let m: Analyse['tilVisning'] = [-1, 0, cx, 0, 1, -cy];
  if (liggende) {
    // roter 90°: (u,v) = (-v0, u0)
    m = [0, -1, cy, -1, 0, cx];
  }
  const kamera = hullPlate[0];
  if (kamera) {
    const [kx, ky] = tyngdepunkt(kamera);
    const v = m[3] * kx + m[4] * ky + m[5];
    if (v < 0) m = [-m[0], -m[1], -m[2], -m[3], -m[4], -m[5]]; // 180°
  }

  const iVisning = (cs: CrossSection) => cs.transform(mat3(m));
  const somVisning = (r: Ring): Ring =>
    r.map(([x, y]) => [
      Math.round((m[0] * x + m[1] * y + m[2]) * 100) / 100,
      Math.round((m[3] * x + m[4] * y + m[5]) * 100) / 100,
    ]);

  // trygg sone: bort fra kanter og hull, og bare der baksiden er tykk nok bak motivet
  const bak = region(wasm, snitt(nett, dybde + 0.25)).offset(-0.4, 'Round');
  const trygg = iVisning(bunn.offset(-KANTAVSTAND, 'Round').intersect(bak));
  const tryggRinger = avrund(trygg);

  const sil = somVisning(silhuettPlate);
  const us = sil.map((p) => p[0]);
  const vs = sil.map((p) => p[1]);

  return {
    versjon: 1,
    kasseDel,
    tilVisning: m,
    silhuett: sil,
    hull: hullPlate.map(somVisning).map((r) => r.reverse() as Ring),
    trygg: somPolygoner(tryggRinger),
    bredde: Math.round((Math.max(...us) - Math.min(...us)) * 100) / 100,
    hoyde: Math.round((Math.max(...vs) - Math.min(...vs)) * 100) / 100,
    tykkelse,
    dybde: Math.round(dybde * 100) / 100,
    trekanter: nett.trekanter.length / 3,
  };
}
