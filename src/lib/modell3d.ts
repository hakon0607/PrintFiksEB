/**
 * Leser en 3D-fil (STL eller 3MF) for visning på produktsiden.
 * Gir trekantene som en flat liste (x, y, z per hjørne), snudd så den står
 * som på printeren (z opp → y opp) og sentrert rundt origo.
 */
import { les3mf } from './deksel/mesh';

export const MODELL_3D_TYPER = /\.(stl|3mf)$/i;
/** Største fil vi tar imot (Supabase tillater 50 MB per fil). */
export const MAKS_3D_MB = 50;

function fraStl(data: Uint8Array): Float32Array {
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const antall = data.byteLength >= 84 ? dv.getUint32(80, true) : 0;
  if (antall > 0 && 84 + antall * 50 === data.byteLength) {
    const xyz = new Float32Array(antall * 9);
    for (let i = 0; i < antall; i++) {
      const o = 84 + i * 50 + 12;
      for (let k = 0; k < 9; k++) xyz[i * 9 + k] = dv.getFloat32(o + k * 4, true);
    }
    return xyz;
  }
  // tekst-STL
  const txt = new TextDecoder().decode(data);
  const tall: number[] = [];
  const re = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(txt))) tall.push(+m[1], +m[2], +m[3]);
  if (tall.length < 9) throw new Error('Klarte ikke å lese STL-fila.');
  return new Float32Array(tall);
}

function fra3mf(data: Uint8Array): Float32Array {
  const { deler } = les3mf(data);
  let n = 0;
  for (const d of deler) n += d.nett.trekanter.length;
  if (!n) throw new Error('Fant ingen modell i 3MF-fila.');
  const xyz = new Float32Array(n * 3);
  let k = 0;
  for (const d of deler) {
    const P = d.nett.punkter, T = d.nett.trekanter;
    for (let i = 0; i < T.length; i++) {
      const j = T[i] * 3;
      xyz[k++] = P[j]; xyz[k++] = P[j + 1]; xyz[k++] = P[j + 2];
    }
  }
  return xyz;
}

/** Trekantene klare for three.js, pluss størrelsen i mm (bredde, høyde, dybde). */
export function les3dFil(data: Uint8Array, filnavn: string): { posisjoner: Float32Array; storrelse: [number, number, number] } {
  const erZip = data[0] === 0x50 && data[1] === 0x4b;
  const xyz = erZip || /\.3mf$/i.test(filnavn) ? fra3mf(data) : fraStl(data);
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < xyz.length; i += 3) {
    const x = xyz[i], y = xyz[i + 1], z = xyz[i + 2];
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
    if (z < z0) z0 = z; if (z > z1) z1 = z;
  }
  if (!Number.isFinite(x0)) throw new Error('Fila ser tom ut.');
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
  // printer (x, y, z) → visning (x, z, −y): z opp blir y opp, ingen speiling
  const ut = new Float32Array(xyz.length);
  for (let i = 0; i < xyz.length; i += 3) {
    ut[i] = xyz[i] - cx;
    ut[i + 1] = xyz[i + 2] - cz;
    ut[i + 2] = -(xyz[i + 1] - cy);
  }
  return { posisjoner: ut, storrelse: [x1 - x0, z1 - z0, y1 - y0] };
}
