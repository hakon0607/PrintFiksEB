/**
 * Lager printfila: dekselet deles i én del per farge, der motivet ligger
 * innfelt i baksiden (0,4–0,6 mm). Selve dekselformen endres ikke – delene
 * passer sammen til nøyaktig den samme formen som originalen.
 *
 * Ut kommer et ferdig Bambu Studio-prosjekt (3MF) med fargene satt, og en
 * reserve-pakke med én STL per farge.
 */
import type { CrossSection, Manifold, ManifoldToplevel } from 'manifold-3d';
import { strToU8, zipSync } from 'fflate';
import { invers, type Analyse, type Ring } from './analyse';
import type { Lest, Nett } from './mesh';

export type Design = {
  /** Fargekart: 0 = dekselfarge, 1..n = motivfarger. Rad for rad, øverst først. */
  kart: Uint8Array;
  bredde: number; // piksler
  hoyde: number;
  /** mm per piksel */
  skala: number;
  /** Øvre venstre hjørne av kartet i visning (sett utenfra), mm */
  u0: number;
  v0: number;
  /** Farger: [dekselfarge, motiv1, …] med navn og hex */
  farger: { navn: string; hex: string }[];
};

export type Resultat = {
  deler: { navn: string; filament: number; hex: string; nett: Nett; volum: number }[];
  /** Kontroll: summen av delene minus originalen, mm³ (skal være ~0) */
  avvik: number;
};

function tilManifold(wasm: ManifoldToplevel, nett: Nett): Manifold {
  const mesh = new wasm.Mesh({ numProp: 3, vertProperties: nett.punkter, triVerts: nett.trekanter });
  try {
    return new wasm.Manifold(mesh);
  } catch {
    mesh.merge();
    try {
      return new wasm.Manifold(mesh);
    } catch {
      throw new Error('Dekselfila er ikke helt tett (ikke «manifold»). Reparer den i Bambu Studio og last opp på nytt.');
    }
  }
}

function fraManifold(m: Manifold): Nett {
  const mesh = m.getMesh();
  const n = mesh.numProp;
  let punkter = mesh.vertProperties as Float32Array;
  if (n !== 3) {
    punkter = new Float32Array((mesh.vertProperties.length / n) * 3);
    for (let i = 0, j = 0; i < mesh.vertProperties.length; i += n, j += 3) {
      punkter[j] = mesh.vertProperties[i];
      punkter[j + 1] = mesh.vertProperties[i + 1];
      punkter[j + 2] = mesh.vertProperties[i + 2];
    }
  }
  return { punkter: new Float32Array(punkter), trekanter: new Uint32Array(mesh.triVerts) };
}

/**
 * Glatte konturer for én farge: masken mykes litt opp, og så følger vi
 * 50 %-grensen med «marching squares». Da blir en sirkel rund – ikke en trapp.
 */
export function konturer(d: Pick<Design, 'kart' | 'bredde' | 'hoyde' | 'skala' | 'u0' | 'v0'>, farge: number): Ring[] {
  const W = d.bredde + 4, H = d.hoyde + 4; // to piksler kant rundt, så alt lukkes
  const m = new Float32Array(W * H);
  for (let j = 0; j < d.hoyde; j++)
    for (let i = 0; i < d.bredde; i++) if (d.kart[j * d.bredde + i] === farge) m[(j + 2) * W + i + 2] = 1;
  // [1 4 6 4 1]-utjevning i begge retninger (to runder [1 2 1])
  let f = m;
  for (let runde = 0; runde < 2; runde++) {
    const t = new Float32Array(W * H);
    for (let j = 0; j < H; j++)
      for (let i = 1; i < W - 1; i++) t[j * W + i] = (f[j * W + i - 1] + 2 * f[j * W + i] + f[j * W + i + 1]) / 4;
    const u = new Float32Array(W * H);
    for (let j = 1; j < H - 1; j++)
      for (let i = 0; i < W; i++) u[j * W + i] = (t[(j - 1) * W + i] + 2 * t[j * W + i] + t[(j + 1) * W + i]) / 4;
    f = u;
  }

  // kantpunkter: id → posisjon (i rutenettet)
  const pos = new Map<number, [number, number]>();
  const nabo = new Map<number, number[]>();
  const H_ = (i: number, j: number) => (j * W + i) * 2; // vannrett kant fra (i,j) til (i+1,j)
  const V_ = (i: number, j: number) => (j * W + i) * 2 + 1; // loddrett kant fra (i,j) til (i,j+1)
  const lerp = (a: number, b: number) => (a === b ? 0.5 : (0.5 - a) / (b - a));
  const punkt = (id: number, x: number, y: number) => { if (!pos.has(id)) pos.set(id, [x, y]); };
  const kobl = (a: number, b: number) => {
    (nabo.get(a) ?? nabo.set(a, []).get(a)!).push(b);
    (nabo.get(b) ?? nabo.set(b, []).get(b)!).push(a);
  };

  for (let j = 0; j < H - 1; j++) {
    for (let i = 0; i < W - 1; i++) {
      const tl = f[j * W + i], tr = f[j * W + i + 1], br = f[(j + 1) * W + i + 1], bl = f[(j + 1) * W + i];
      const k = (tl >= 0.5 ? 8 : 0) | (tr >= 0.5 ? 4 : 0) | (br >= 0.5 ? 2 : 0) | (bl >= 0.5 ? 1 : 0);
      if (k === 0 || k === 15) continue;
      const T = H_(i, j), B = H_(i, j + 1), L = V_(i, j), R = V_(i + 1, j);
      const p: Record<string, () => number> = {
        T: () => (punkt(T, i + lerp(tl, tr), j), T),
        B: () => (punkt(B, i + lerp(bl, br), j + 1), B),
        L: () => (punkt(L, i, j + lerp(tl, bl)), L),
        R: () => (punkt(R, i + 1, j + lerp(tr, br)), R),
      };
      const seg = (a: string, b: string) => kobl(p[a](), p[b]());
      const midt = (tl + tr + br + bl) / 4 >= 0.5;
      switch (k) {
        case 1: case 14: seg('L', 'B'); break;
        case 2: case 13: seg('B', 'R'); break;
        case 3: case 12: seg('L', 'R'); break;
        case 4: case 11: seg('T', 'R'); break;
        case 6: case 9: seg('T', 'B'); break;
        case 7: case 8: seg('T', 'L'); break;
        case 5: if (midt) { seg('T', 'L'); seg('B', 'R'); } else { seg('T', 'R'); seg('L', 'B'); } break;
        case 10: if (midt) { seg('T', 'R'); seg('L', 'B'); } else { seg('T', 'L'); seg('B', 'R'); } break;
      }
    }
  }

  // kjed sammen til ringer
  const ringer: Ring[] = [];
  const sett = new Set<number>();
  const tilMm = ([x, y]: [number, number]): [number, number] => [
    d.u0 + (x - 2 + 0.5) * d.skala,
    d.v0 - (y - 2 + 0.5) * d.skala,
  ];
  nabo.forEach((_, start) => {
    if (sett.has(start)) return;
    const ring: Ring = [];
    let forrige = -1, naa = start;
    for (let guard = 0; guard < 1e7; guard++) {
      sett.add(naa);
      ring.push(tilMm(pos.get(naa)!));
      const n = nabo.get(naa)!;
      const neste = n[0] !== forrige ? n[0] : n[1];
      if (neste === undefined || neste === start) break;
      if (sett.has(neste)) break;
      forrige = naa;
      naa = neste;
    }
    if (ring.length >= 3) ringer.push(ring);
  });
  return ringer;
}

/** Fargekartet → én flate (CrossSection) per motivfarge, i visning. */
function flater(wasm: ManifoldToplevel, d: Design): (CrossSection | null)[] {
  const ut: (CrossSection | null)[] = [];
  for (let farge = 1; farge < d.farger.length; farge++) {
    const ringer = konturer(d, farge);
    if (!ringer.length) { ut.push(null); continue; }
    // fjern det som er for smalt til å printe (< ~0,45 mm), og glatt helt til slutt
    const flate = wasm.CrossSection.ofPolygons(ringer, 'EvenOdd')
      .offset(-0.22, 'Round', 2, 24)
      .offset(0.22, 'Round', 2, 24)
      .simplify(0.015);
    ut.push(flate);
  }
  return ut;
}

export function lagDeler(wasm: ManifoldToplevel, lest: Lest, analyse: Analyse, design: Design): Resultat {
  const kasse = tilManifold(wasm, lest.deler[analyse.kasseDel].nett);
  const tilPlate = invers(analyse.tilVisning);
  const [a, b, c, d, e, f] = tilPlate;
  const m3 = [a, d, 0, b, e, 0, c, f, 1] as unknown as Parameters<CrossSection['transform']>[0];
  const trygg = wasm.CrossSection.ofPolygons(analyse.trygg.flat(), 'EvenOdd');

  const prismer: { p: Manifold; farge: number }[] = [];
  const motiv = flater(wasm, design);
  let brukt: CrossSection | null = null;
  motiv.forEach((flate, i) => {
    if (!flate) return;
    // innenfor trygg sone, og aldri overlapp med en tidligere farge
    let ren = flate.intersect(trygg);
    if (brukt) ren = ren.subtract(brukt);
    if (ren.isEmpty() || ren.area() < 0.5) return;
    brukt = brukt ? wasm.CrossSection.union(brukt, ren) : ren;
    const plate = ren.transform(m3);
    prismer.push({ p: plate.extrude(analyse.dybde + 1).translate([0, 0, -1]), farge: i + 1 });
  });

  const deler: Resultat['deler'] = [];
  const alle = prismer.length ? wasm.Manifold.union(prismer.map((x) => x.p)) : null;
  const rest = alle ? kasse.subtract(alle) : kasse;
  deler.push({ navn: 'Deksel', filament: 1, hex: design.farger[0].hex, nett: fraManifold(rest), volum: rest.volume() });
  prismer.forEach(({ p, farge }) => {
    const del = kasse.intersect(p);
    if (del.isEmpty()) return;
    const i = farge - 1;
    deler.push({
      navn: `Motiv – ${design.farger[i + 1].navn}`,
      filament: deler.length + 1,
      hex: design.farger[i + 1].hex,
      nett: fraManifold(del),
      volum: del.volume(),
    });
  });
  const avvik = deler.reduce((s, x) => s + x.volum, 0) - kasse.volume();
  return { deler, avvik };
}

/* ------------------------------------------------------------------ */
/*  3MF (Bambu Studio-prosjekt)                                        */
/* ------------------------------------------------------------------ */

const NS =
  'xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p"';

function uuid(n: number, hale: string) {
  return `${n.toString(16).padStart(8, '0')}-${hale}`;
}

function meshXml(id: number, nett: Nett): string {
  const p = nett.punkter, t = nett.trekanter;
  const deler: string[] = [`  <object id="${id}" p:UUID="${uuid(id, '81cb-4c03-9d28-80fed5dfa1dc')}" type="model">\n   <mesh>\n    <vertices>\n`];
  for (let i = 0; i < p.length; i += 3) {
    deler.push(`     <vertex x="${+p[i].toFixed(5)}" y="${+p[i + 1].toFixed(5)}" z="${+p[i + 2].toFixed(5)}"/>\n`);
  }
  deler.push('    </vertices>\n    <triangles>\n');
  for (let i = 0; i < t.length; i += 3) deler.push(`     <triangle v1="${t[i]}" v2="${t[i + 1]}" v3="${t[i + 2]}"/>\n`);
  deler.push('    </triangles>\n   </mesh>\n  </object>\n');
  return deler.join('');
}

/** Utvider prosjektinnstillingene fra 1 til n filamenter, med riktige farger. */
function prosjekt(mal: Record<string, unknown>, farger: string[]): Record<string, unknown> {
  const d: Record<string, unknown> = JSON.parse(JSON.stringify(mal));
  const n = farger.length;
  const PER_FILAMENT = new Set([
    'activate_air_filtration', 'additional_cooling_fan_speed', 'chamber_temperatures',
    'close_fan_the_first_x_layers', 'complete_print_exhaust_fan_speed', 'cool_plate_temp',
    'cool_plate_temp_initial_layer', 'default_filament_colour', 'during_print_exhaust_fan_speed',
    'enable_overhang_bridge_fan', 'enable_pressure_advance', 'eng_plate_temp',
    'eng_plate_temp_initial_layer', 'fan_cooling_layer_time', 'fan_max_speed', 'fan_min_speed',
    'full_fan_speed_layer', 'hot_plate_temp', 'hot_plate_temp_initial_layer', 'impact_strength_z',
    'nozzle_temperature', 'nozzle_temperature_initial_layer', 'nozzle_temperature_range_high',
    'nozzle_temperature_range_low', 'overhang_fan_speed', 'overhang_fan_threshold',
    'overhang_threshold_participating_cooling', 'pre_start_fan_time', 'pressure_advance',
    'reduce_fan_stop_start_freq', 'required_nozzle_HRC', 'slow_down_for_layer_cooling',
    'slow_down_layer_time', 'slow_down_min_speed', 'supertack_plate_temp',
    'supertack_plate_temp_initial_layer', 'temperature_vitrification', 'textured_plate_temp',
    'textured_plate_temp_initial_layer', 'counter_coef_1', 'counter_coef_2', 'counter_coef_3',
    'counter_limit_max', 'counter_limit_min', 'hole_coef_1', 'hole_coef_2', 'hole_coef_3',
    'hole_limit_max', 'hole_limit_min', 'diameter_limit', 'circle_compensation_speed',
  ]);
  for (const [k, v] of Object.entries(d)) {
    if (!Array.isArray(v) || v.length < 1) continue;
    const erFil = (k.startsWith('filament_') && k !== 'filament_map' && k !== 'filament_self_index') || PER_FILAMENT.has(k);
    if (!erFil) continue;
    // ta første verdi som mal for alle
    d[k] = Array.from({ length: n }, (_, i) => (v as unknown[])[Math.min(i, v.length - 1)] ?? v[0]);
  }
  d.filament_colour = farger;
  d.filament_map = farger.map(() => '1');
  d.filament_self_index = farger.map((_, i) => String(i + 1));
  d.default_filament_colour = farger.map(() => '');
  d.flush_volumes_vector = Array.from({ length: n * 2 }, () => '140');
  // rensevolum: mørkt → lyst trenger mest
  const lys = (h: string) => {
    const x = parseInt(h.slice(1), 16);
    return (0.299 * ((x >> 16) & 255) + 0.587 * ((x >> 8) & 255) + 0.114 * (x & 255)) / 255;
  };
  const matrise: string[] = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      if (i === j) { matrise.push('0'); continue; }
      const forskjell = Math.max(0, lys(farger[j]) - lys(farger[i]));
      matrise.push(String(Math.round(160 + 480 * forskjell)));
    }
  d.flush_volumes_matrix = matrise;
  const ds = d.different_settings_to_system;
  if (Array.isArray(ds) && ds.length >= 2) {
    d.different_settings_to_system = [ds[0], ...Array.from({ length: n }, () => ds[1] ?? ''), ds[ds.length - 1]];
  }
  return d;
}

function plateMidt(mal: Record<string, unknown>): [number, number] {
  const omr = mal.printable_area;
  if (Array.isArray(omr) && omr.length >= 3) {
    const pts = omr.map((x) => String(x).split('x').map(Number)).filter((p) => p.length === 2 && p.every(Number.isFinite));
    if (pts.length) {
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
    }
  }
  return [128, 128];
}

export function lag3mf(
  res: Resultat,
  andre: Nett[],
  prosjektMal: Record<string, unknown>,
  tittel: string
): Uint8Array {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  // del-id-er i objektfila: 1..k for dekselet, så de andre tingene
  const objekter: string[] = [];
  res.deler.forEach((d, i) => objekter.push(meshXml(i + 1, d.nett)));
  andre.forEach((n, i) => objekter.push(meshXml(res.deler.length + i + 1, n)));
  const objektfil =
    `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" ${NS}>\n` +
    ` <metadata name="BambuStudio:3mfVersion">1</metadata>\n <resources>\n${objekter.join('')} </resources>\n <build/>\n</model>\n`;

  const KASSE = 1000;
  const komp = (id: number) =>
    `    <component p:path="/3D/Objects/object_1.model" objectid="${id}" p:UUID="${uuid(id, 'b206-40ff-9872-83e8017abed1')}" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>\n`;
  const rotObjekter = [
    `  <object id="${KASSE}" p:UUID="${uuid(KASSE, '61cb-4c03-9d28-80fed5dfa1dc')}" type="model">\n   <components>\n${res.deler
      .map((_, i) => komp(i + 1))
      .join('')}   </components>\n  </object>\n`,
    ...andre.map(
      (_, i) =>
        `  <object id="${KASSE + i + 1}" p:UUID="${uuid(KASSE + i + 1, '61cb-4c03-9d28-80fed5dfa1dc')}" type="model">\n   <components>\n${komp(
          res.deler.length + i + 1
        )}   </components>\n  </object>\n`
    ),
  ];
  // flytt alt så dekselet havner midt på plata (STL-er ligger ofte rundt origo)
  const midt = plateMidt(prosjektMal);
  const p0 = res.deler[0].nett.punkter;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < p0.length; i += 3) {
    minX = Math.min(minX, p0[i]); maxX = Math.max(maxX, p0[i]);
    minY = Math.min(minY, p0[i + 1]); maxY = Math.max(maxY, p0[i + 1]);
  }
  const tx = +(midt[0] - (minX + maxX) / 2).toFixed(4);
  const ty = +(midt[1] - (minY + maxY) / 2).toFixed(4);
  const items = [KASSE, ...andre.map((_, i) => KASSE + i + 1)]
    .map((id) => `  <item objectid="${id}" p:UUID="${uuid(id, 'b1ec-4553-aec9-835e5b724bb4')}" transform="1 0 0 0 1 0 0 0 1 ${tx} ${ty} 0" printable="1"/>\n`)
    .join('');
  const rot =
    `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" ${NS}>\n` +
    ` <metadata name="Application">BambuStudio-02.01.00.59</metadata>\n <metadata name="BambuStudio:3mfVersion">1</metadata>\n` +
    ` <metadata name="Title">${esc(tittel)}</metadata>\n <metadata name="Designer">PrintFiksEB</metadata>\n` +
    ` <resources>\n${rotObjekter.join('')} </resources>\n <build p:UUID="2c7c17d8-22b5-4d84-8835-1976022ea369">\n${items} </build>\n</model>\n`;

  const del = (id: number, navn: string, filament: number, n: Nett) =>
    `    <part id="${id}" subtype="normal_part">\n      <metadata key="name" value="${esc(navn)}"/>\n      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>\n      <metadata key="extruder" value="${filament}"/>\n      <mesh_stat face_count="${n.trekanter.length / 3}" edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"/>\n    </part>\n`;
  const innstillinger =
    `<?xml version="1.0" encoding="UTF-8"?>\n<config>\n` +
    `  <object id="${KASSE}">\n    <metadata key="name" value="${esc(tittel)}"/>\n    <metadata key="extruder" value="1"/>\n` +
    res.deler.map((d, i) => del(i + 1, d.navn, d.filament, d.nett)).join('') +
    `  </object>\n` +
    andre
      .map(
        (n, i) =>
          `  <object id="${KASSE + i + 1}">\n    <metadata key="name" value="Del ${i + 2}"/>\n    <metadata key="extruder" value="1"/>\n` +
          del(res.deler.length + i + 1, `Del ${i + 2}`, 1, n) +
          `  </object>\n`
      )
      .join('') +
    `  <plate>\n    <metadata key="plater_id" value="1"/>\n    <metadata key="plater_name" value=""/>\n    <metadata key="locked" value="false"/>\n` +
    [KASSE, ...andre.map((_, i) => KASSE + i + 1)]
      .map(
        (id, i) =>
          `    <model_instance>\n      <metadata key="object_id" value="${id}"/>\n      <metadata key="instance_id" value="0"/>\n      <metadata key="identify_id" value="${200 + i}"/>\n    </model_instance>\n`
      )
      .join('') +
    `  </plate>\n</config>\n`;

  const filer: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>\n <Default Extension="png" ContentType="image/png"/>\n <Default Extension="gcode" ContentType="text/x.gcode"/>\n</Types>\n'
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n</Relationships>\n'
    ),
    '3D/3dmodel.model': strToU8(rot),
    '3D/_rels/3dmodel.model.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n <Relationship Target="/3D/Objects/object_1.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n</Relationships>\n'
    ),
    '3D/Objects/object_1.model': strToU8(objektfil),
    'Metadata/model_settings.config': strToU8(innstillinger),
    'Metadata/project_settings.config': strToU8(
      JSON.stringify(prosjekt(prosjektMal, res.deler.map((d) => d.hex)), null, 4)
    ),
  };
  return zipSync(filer, { level: 6 });
}

/* ------------------------------------------------------------------ */
/*  STL-reserve: én fil per farge                                      */
/* ------------------------------------------------------------------ */

function stl(nett: Nett): Uint8Array {
  const n = nett.trekanter.length / 3;
  const buf = new ArrayBuffer(84 + n * 50);
  const dv = new DataView(buf);
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

export function lagStlPakke(res: Resultat, andre: Nett[]): Uint8Array {
  const filer: Record<string, Uint8Array> = {};
  res.deler.forEach((d) => {
    const navn = `${d.filament}-${d.navn.replace(/[^a-zA-Z0-9æøåÆØÅ]+/g, '-').replace(/-+$/, '')}.stl`;
    filer[navn] = stl(d.nett);
  });
  andre.forEach((n, i) => { filer[`ekstra-del-${i + 2}.stl`] = stl(n); });
  filer['LES-MEG.txt'] = strToU8(
    'Reserve hvis 3MF-fila ikke åpner riktig:\n' +
      '1. Dra alle STL-filene inn i Bambu Studio samtidig.\n' +
      '2. Svar «Ja» når den spør om å laste dem som ett objekt med flere deler.\n' +
      '3. Gi hver del riktig filament – tallet først i filnavnet er filamentnummeret.\n'
  );
  return zipSync(filer, { level: 6 });
}
