/**
 * Leser dekselmodeller (3MF fra Bambu Studio, eller STL) og gir oss
 * trekant-nett i platekoordinater: mm, z = 0 er printeplata.
 * Ingen DOM – virker både i nettleseren og i Node.
 */
import { unzipSync, strFromU8 } from 'fflate';

export type Nett = {
  /** x,y,z, x,y,z … */
  punkter: Float32Array;
  /** tre punkt-indekser per trekant */
  trekanter: Uint32Array;
};

export type Del = { navn: string; nett: Nett };

/** 3MF lagrer 4x3-matriser som radvektorer: p' = p·M (+ t). Vi bruker 3x4, kolonneform. */
export type Matrise = number[]; // [a,b,c,tx, d,e,f,ty, g,h,i,tz]

export const ENHET: Matrise = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];

export function lesMatrise(s: string | null | undefined): Matrise {
  if (!s) return ENHET.slice();
  const a = s.trim().split(/\s+/).map(Number);
  if (a.length !== 12 || a.some((x) => !Number.isFinite(x))) return ENHET.slice();
  // radvektor-form → kolonneform: rad i i 3MF blir kolonne i her
  return [a[0], a[3], a[6], a[9], a[1], a[4], a[7], a[10], a[2], a[5], a[8], a[11]];
}

/** Først b, så a (a·b i kolonneform). */
export function gang(a: Matrise, b: Matrise): Matrise {
  const r: number[] = new Array(12).fill(0);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      r[i * 4 + j] = a[i * 4] * b[j] + a[i * 4 + 1] * b[4 + j] + a[i * 4 + 2] * b[8 + j];
    }
    r[i * 4 + 3] = a[i * 4] * b[3] + a[i * 4 + 1] * b[7] + a[i * 4 + 2] * b[11] + a[i * 4 + 3];
  }
  return r;
}

export function transformer(nett: Nett, m: Matrise): Nett {
  const p = nett.punkter;
  const ut = new Float32Array(p.length);
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i], y = p[i + 1], z = p[i + 2];
    ut[i] = m[0] * x + m[1] * y + m[2] * z + m[3];
    ut[i + 1] = m[4] * x + m[5] * y + m[6] * z + m[7];
    ut[i + 2] = m[8] * x + m[9] * y + m[10] * z + m[11];
  }
  // speiling snur trekantene – rett dem opp igjen
  const det =
    m[0] * (m[5] * m[10] - m[6] * m[9]) -
    m[1] * (m[4] * m[10] - m[6] * m[8]) +
    m[2] * (m[4] * m[9] - m[5] * m[8]);
  let t = nett.trekanter;
  if (det < 0) {
    t = new Uint32Array(t);
    for (let i = 0; i < t.length; i += 3) [t[i + 1], t[i + 2]] = [t[i + 2], t[i + 1]];
  }
  return { punkter: ut, trekanter: t };
}

export function grenser(nett: Nett) {
  const p = nett.punkter;
  const min = [Infinity, Infinity, Infinity];
  const maks = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      if (p[i + k] < min[k]) min[k] = p[i + k];
      if (p[i + k] > maks[k]) maks[k] = p[i + k];
    }
  }
  return { min, maks };
}

/* ------------------------------------------------------------------ */
/*  3MF                                                                */
/* ------------------------------------------------------------------ */

function attr(tag: string, navn: string): string | null {
  const m = tag.match(new RegExp(`(?:^|\\s)${navn.replace(':', '\\:')}="([^"]*)"`));
  return m ? m[1] : null;
}

function lesMeshXml(xml: string): Nett {
  const pts: number[] = [];
  const re = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) pts.push(+m[1], +m[2], +m[3]);
  const tri: number[] = [];
  const rt = /<triangle\s+v1="(\d+)"\s+v2="(\d+)"\s+v3="(\d+)"/g;
  while ((m = rt.exec(xml))) tri.push(+m[1], +m[2], +m[3]);
  return { punkter: new Float32Array(pts), trekanter: new Uint32Array(tri) };
}

type ObjDef = {
  id: string;
  mesh?: Nett;
  komponenter: { sti: string | null; objectid: string; m: Matrise }[];
};

function lesObjekter(xml: string): Map<string, ObjDef> {
  const ut = new Map<string, ObjDef>();
  const re = /<object\b([^>]*)>([\s\S]*?)<\/object>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const id = attr(m[1], 'id') ?? '';
    const kropp = m[2];
    const def: ObjDef = { id, komponenter: [] };
    if (/<mesh\b/.test(kropp)) def.mesh = lesMeshXml(kropp);
    const rc = /<component\b([^>]*)\/?>/g;
    let c: RegExpExecArray | null;
    while ((c = rc.exec(kropp))) {
      def.komponenter.push({
        sti: attr(c[1], 'p:path'),
        objectid: attr(c[1], 'objectid') ?? '',
        m: lesMatrise(attr(c[1], 'transform')),
      });
    }
    ut.set(id, def);
  }
  return ut;
}

function slaSammen(deler: Nett[]): Nett {
  let np = 0, nt = 0;
  for (const d of deler) { np += d.punkter.length; nt += d.trekanter.length; }
  const p = new Float32Array(np);
  const t = new Uint32Array(nt);
  let op = 0, ot = 0;
  for (const d of deler) {
    p.set(d.punkter, op);
    const forskyv = op / 3;
    for (let i = 0; i < d.trekanter.length; i++) t[ot + i] = d.trekanter[i] + forskyv;
    op += d.punkter.length;
    ot += d.trekanter.length;
  }
  return { punkter: p, trekanter: t };
}

export type Lest = {
  /** Hver «ting» på plata, i platekoordinater. */
  deler: Del[];
  /** Prosjektinnstillingene fra Bambu Studio, hvis fila hadde det. */
  prosjekt: Record<string, unknown> | null;
};

export function les3mf(data: Uint8Array): Lest {
  const filer = unzipSync(data);
  const tekst = (sti: string) => {
    const k = Object.keys(filer).find((f) => f.toLowerCase() === sti.replace(/^\//, '').toLowerCase());
    return k ? strFromU8(filer[k]) : null;
  };
  const rot = tekst('3D/3dmodel.model');
  if (!rot) throw new Error('Fant ikke 3D/3dmodel.model i 3MF-fila.');
  const filObj = new Map<string, Map<string, ObjDef>>();
  const objekterI = (sti: string | null) => {
    const s = sti ?? '/3D/3dmodel.model';
    if (!filObj.has(s)) {
      const x = s === '/3D/3dmodel.model' ? rot : tekst(s);
      filObj.set(s, x ? lesObjekter(x) : new Map());
    }
    return filObj.get(s)!;
  };

  // samler alle trekanter for et objekt, med transformene nedover treet
  const samle = (sti: string | null, id: string, m: Matrise, dybde = 0): Nett[] => {
    if (dybde > 8) return [];
    const o = objekterI(sti).get(id);
    if (!o) return [];
    const ut: Nett[] = [];
    if (o.mesh) ut.push(transformer(o.mesh, m));
    for (const k of o.komponenter) ut.push(...samle(k.sti ?? sti, k.objectid, gang(m, k.m), dybde + 1));
    return ut;
  };

  const navn = new Map<string, string>();
  const ms = tekst('Metadata/model_settings.config');
  if (ms) {
    const ro = /<object id="(\d+)">\s*<metadata key="name" value="([^"]*)"/g;
    let m: RegExpExecArray | null;
    while ((m = ro.exec(ms))) navn.set(m[1], m[2]);
  }

  const deler: Del[] = [];
  const bygg = rot.match(/<build\b[^>]*>([\s\S]*?)<\/build>/);
  const ri = /<item\b([^>]*)\/?>/g;
  let it: RegExpExecArray | null;
  while (bygg && (it = ri.exec(bygg[1]))) {
    const id = attr(it[1], 'objectid') ?? '';
    const biter = samle(null, id, lesMatrise(attr(it[1], 'transform')));
    if (biter.length) deler.push({ navn: navn.get(id) ?? `Objekt ${id}`, nett: slaSammen(biter) });
  }

  let prosjekt: Record<string, unknown> | null = null;
  const ps = tekst('Metadata/project_settings.config');
  if (ps) {
    try { prosjekt = JSON.parse(ps); } catch { prosjekt = null; }
  }
  return { deler, prosjekt };
}

/* ------------------------------------------------------------------ */
/*  STL (binær og tekst)                                               */
/* ------------------------------------------------------------------ */

/** STL har ikke delte hjørner – vi slår sammen like punkter så nettet blir lukket. */
function fraTrekantsuppe(xyz: Float32Array): Nett {
  const kart = new Map<string, number>();
  const pts: number[] = [];
  const tri = new Uint32Array(xyz.length / 3);
  for (let i = 0; i < xyz.length; i += 3) {
    const k = `${Math.round(xyz[i] * 1e4)},${Math.round(xyz[i + 1] * 1e4)},${Math.round(xyz[i + 2] * 1e4)}`;
    let idx = kart.get(k);
    if (idx === undefined) {
      idx = pts.length / 3;
      kart.set(k, idx);
      pts.push(xyz[i], xyz[i + 1], xyz[i + 2]);
    }
    tri[i / 3] = idx;
  }
  return { punkter: new Float32Array(pts), trekanter: tri };
}

export function lesStl(data: Uint8Array): Lest {
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const antall = data.byteLength >= 84 ? dv.getUint32(80, true) : 0;
  let xyz: Float32Array;
  if (antall > 0 && 84 + antall * 50 === data.byteLength) {
    xyz = new Float32Array(antall * 9);
    for (let i = 0; i < antall; i++) {
      const o = 84 + i * 50 + 12;
      for (let k = 0; k < 9; k++) xyz[i * 9 + k] = dv.getFloat32(o + k * 4, true);
    }
  } else {
    const txt = strFromU8(data);
    const tall = [...txt.matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g)].flatMap((m) => [+m[1], +m[2], +m[3]]);
    if (tall.length < 9) throw new Error('Klarte ikke å lese STL-fila.');
    xyz = new Float32Array(tall);
  }
  // legg den ned på plata (z = 0)
  let zmin = Infinity;
  for (let i = 2; i < xyz.length; i += 3) zmin = Math.min(zmin, xyz[i]);
  for (let i = 2; i < xyz.length; i += 3) xyz[i] -= zmin;
  return { deler: [{ navn: 'Deksel', nett: fraTrekantsuppe(xyz) }], prosjekt: null };
}

export function lesModell(data: Uint8Array, filnavn: string): Lest {
  const erZip = data[0] === 0x50 && data[1] === 0x4b;
  if (erZip || /\.3mf$/i.test(filnavn)) return les3mf(data);
  return lesStl(data);
}
