/**
 * Pepperkakeformen som 3D-modell, laget fra streken kunden tegnet.
 *
 * Printes med den brede kanten (flensen) ned mot plata og skjærekanten opp:
 *   - flens: 8 mm bred og 2,4 mm tykk – det man trykker på, så formen ikke
 *     kutter i hånda og tåler å presses hardt
 *   - fot: en skrå forsterkning mellom flensen og veggen, så veggen ikke knekker av
 *   - vegg: 2,5 mm tykk nederst, smalner til 1 mm i toppen – skarp nok til
 *     å skjære rent, men ikke så tynn at den brekker
 * Total høyde 15 mm. Alt er én hvit del.
 *
 * Koordinater: x/y er tegningen i mm (y nedover på skjermen). Slik blir
 * kaken lik tegningen når formen snus og trykkes ned i deigen.
 */
import type { Manifold, ManifoldToplevel } from 'manifold-3d';
import type { Form, Pkt } from './sti';

export const PROFIL = {
  hoyde: 15,
  flensHoyde: 2.4,
  flensRadius: 4,
  fotHoyde: 2.2,
  fotRadius: 2.6,
  veggBunn: 1.25,
  veggTopp: 0.5,
  segmenter: 20,
} as const;

export type Nett = { punkter: Float32Array; trekanter: Uint32Array };

function fraManifold(m: Manifold): Nett {
  const mesh = m.getMesh();
  const n = mesh.numProp;
  const v = mesh.vertProperties as Float32Array;
  const punkter = new Float32Array((v.length / n) * 3);
  for (let i = 0, j = 0; i < v.length; i += n, j += 3) {
    punkter[j] = v[i]; punkter[j + 1] = v[i + 1]; punkter[j + 2] = v[i + 2];
  }
  return { punkter, trekanter: new Uint32Array(mesh.triVerts) };
}

function segmenter(form: Form): [Pkt, Pkt][] {
  const p = form.punkter;
  const ut: [Pkt, Pkt][] = [];
  for (let i = 0; i < p.length - 1; i++) ut.push([p[i], p[i + 1]]);
  if (form.lukket && p.length > 2) ut.push([p[p.length - 1], p[0]]);
  return ut;
}

/** Radiusen (halve veggtykkelsen) i høyde z over plata. */
function radiusVed(z: number): number {
  const { flensHoyde, fotHoyde, fotRadius, veggBunn, veggTopp, hoyde } = PROFIL;
  const zf = z - flensHoyde;
  if (zf < fotHoyde) {
    // hulkil: buer jevnt inn fra den brede foten til veggen
    const t = 1 - zf / fotHoyde;
    return veggBunn + (fotRadius - veggBunn) * t * t;
  }
  const t = (zf - fotHoyde) / (hoyde - flensHoyde - fotHoyde);
  return veggBunn + (veggTopp - veggBunn) * t;
}

/**
 * Lager formen som én tett modell.
 *
 * Bygges som tynne lag oppå hverandre (hvert lag er streken «tykket» til riktig
 * bredde i 2D). Lagene overlapper litt, så alt smelter sammen til én ren, tett
 * del uten løse kanter – også for kronglete tegninger med skarpe hjørner.
 */
export function lagPepperkakeform(wasm: ManifoldToplevel, form: Form): { nett: Nett; volum: number } {
  const { Manifold, CrossSection } = wasm;
  const seg = segmenter(form);
  if (!seg.length) throw new Error('Tegningen er tom.');
  const S = PROFIL.segmenter;

  const temp: { delete: () => void }[] = [];
  const hold = <T extends { delete: () => void }>(x: T) => { temp.push(x); return x; };

  try {
    // Grunnstreken: midtlinja med minste radius (toppen av veggen)
    const r0 = PROFIL.veggTopp;
    const sirkel = (p: Pkt) => hold(CrossSection.circle(r0, S).translate([p[0], p[1]]));
    const grunn = hold(CrossSection.union(seg.map(([a, b]) => hold(CrossSection.hull([sirkel(a), sirkel(b)])))));
    const bredde = (r: number) => (r - r0 < 1e-3 ? grunn : hold(grunn.offset(r - r0, 'Round', 2, 28).simplify(0.015)));

    const deler: Manifold[] = [];
    // 1. Flensen – det man trykker på
    deler.push(hold(bredde(PROFIL.flensRadius).extrude(PROFIL.flensHoyde)));

    // 2. Fot og vegg i lag; tynnere lag i foten der bredden endrer seg raskt
    const lag: [number, number][] = [];
    const zFot = PROFIL.flensHoyde + PROFIL.fotHoyde;
    for (let z = PROFIL.flensHoyde; z < zFot - 1e-6; z += 0.25) lag.push([z, Math.min(0.25, zFot - z)]);
    for (let z = zFot; z < PROFIL.hoyde - 1e-6; z += 0.8) lag.push([z, Math.min(0.8, PROFIL.hoyde - z)]);
    const overlapp = 0.05;
    for (const [z, h] of lag) {
      const r = radiusVed(z + h); // bruk bredden i toppen av laget, så veggen aldri blir for tykk
      const ned = Math.min(overlapp, z); // stikk litt ned i laget under
      deler.push(hold(bredde(r).extrude(h + ned).translate([0, 0, z - ned])));
    }
    const alt = Manifold.union(deler);
    const nett = fraManifold(alt);
    const volum = alt.volume();
    alt.delete();
    return { nett, volum };
  } finally {
    for (const t of temp) { try { t.delete(); } catch { /* allerede frigjort */ } }
  }
}

/** Binær STL. */
export function tilStl(nett: Nett): Uint8Array {
  const n = nett.trekanter.length / 3;
  const buf = new ArrayBuffer(84 + n * 50);
  const dv = new DataView(buf);
  const tittel = 'PrintFiksEB pepperkakeform';
  for (let i = 0; i < tittel.length; i++) dv.setUint8(i, tittel.charCodeAt(i));
  dv.setUint32(80, n, true);
  const p = nett.punkter, t = nett.trekanter;
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50;
    const a = t[i * 3] * 3, b = t[i * 3 + 1] * 3, c = t[i * 3 + 2] * 3;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    dv.setFloat32(o, nx, true); dv.setFloat32(o + 4, ny, true); dv.setFloat32(o + 8, nz, true);
    [a, b, c].forEach((q, k) => {
      dv.setFloat32(o + 12 + k * 12, p[q], true);
      dv.setFloat32(o + 16 + k * 12, p[q + 1], true);
      dv.setFloat32(o + 20 + k * 12, p[q + 2], true);
    });
  }
  return new Uint8Array(buf);
}
