// GENERERT fra src/lib/deksel (mesh, analyse, modellnavn) – brukes av samle-deksler.mjs ved bygging.

// .tmp-test/inngang.ts
import Module from "manifold-3d";

// src/lib/deksel/mesh.ts
import { unzipSync, strFromU8 } from "fflate";
var ENHET = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
function lesMatrise(s) {
  if (!s) return ENHET.slice();
  const a = s.trim().split(/\s+/).map(Number);
  if (a.length !== 12 || a.some((x) => !Number.isFinite(x))) return ENHET.slice();
  return [a[0], a[3], a[6], a[9], a[1], a[4], a[7], a[10], a[2], a[5], a[8], a[11]];
}
function gang(a, b) {
  const r = new Array(12).fill(0);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      r[i * 4 + j] = a[i * 4] * b[j] + a[i * 4 + 1] * b[4 + j] + a[i * 4 + 2] * b[8 + j];
    }
    r[i * 4 + 3] = a[i * 4] * b[3] + a[i * 4 + 1] * b[7] + a[i * 4 + 2] * b[11] + a[i * 4 + 3];
  }
  return r;
}
function transformer(nett, m) {
  const p = nett.punkter;
  const ut = new Float32Array(p.length);
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i], y = p[i + 1], z = p[i + 2];
    ut[i] = m[0] * x + m[1] * y + m[2] * z + m[3];
    ut[i + 1] = m[4] * x + m[5] * y + m[6] * z + m[7];
    ut[i + 2] = m[8] * x + m[9] * y + m[10] * z + m[11];
  }
  const det = m[0] * (m[5] * m[10] - m[6] * m[9]) - m[1] * (m[4] * m[10] - m[6] * m[8]) + m[2] * (m[4] * m[9] - m[5] * m[8]);
  let t = nett.trekanter;
  if (det < 0) {
    t = new Uint32Array(t);
    for (let i = 0; i < t.length; i += 3) [t[i + 1], t[i + 2]] = [t[i + 2], t[i + 1]];
  }
  return { punkter: ut, trekanter: t };
}
function grenser(nett) {
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
function attr(tag, navn) {
  const m = tag.match(new RegExp(`(?:^|\\s)${navn.replace(":", "\\:")}="([^"]*)"`));
  return m ? m[1] : null;
}
function lesMeshXml(xml) {
  const pts = [];
  const re = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g;
  let m;
  while (m = re.exec(xml)) pts.push(+m[1], +m[2], +m[3]);
  const tri = [];
  const rt = /<triangle\s+v1="(\d+)"\s+v2="(\d+)"\s+v3="(\d+)"/g;
  while (m = rt.exec(xml)) tri.push(+m[1], +m[2], +m[3]);
  return { punkter: new Float32Array(pts), trekanter: new Uint32Array(tri) };
}
function lesObjekter(xml) {
  const ut = /* @__PURE__ */ new Map();
  const re = /<object\b([^>]*)>([\s\S]*?)<\/object>/g;
  let m;
  while (m = re.exec(xml)) {
    const id = attr(m[1], "id") ?? "";
    const kropp = m[2];
    const def = { id, komponenter: [] };
    if (/<mesh\b/.test(kropp)) def.mesh = lesMeshXml(kropp);
    const rc = /<component\b([^>]*)\/?>/g;
    let c;
    while (c = rc.exec(kropp)) {
      def.komponenter.push({
        sti: attr(c[1], "p:path"),
        objectid: attr(c[1], "objectid") ?? "",
        m: lesMatrise(attr(c[1], "transform"))
      });
    }
    ut.set(id, def);
  }
  return ut;
}
function slaSammen(deler) {
  let np = 0, nt = 0;
  for (const d of deler) {
    np += d.punkter.length;
    nt += d.trekanter.length;
  }
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
function les3mf(data) {
  const filer = unzipSync(data);
  const tekst = (sti) => {
    const k = Object.keys(filer).find((f) => f.toLowerCase() === sti.replace(/^\//, "").toLowerCase());
    return k ? strFromU8(filer[k]) : null;
  };
  const rot = tekst("3D/3dmodel.model");
  if (!rot) throw new Error("Fant ikke 3D/3dmodel.model i 3MF-fila.");
  const filObj = /* @__PURE__ */ new Map();
  const objekterI = (sti) => {
    const s = sti ?? "/3D/3dmodel.model";
    if (!filObj.has(s)) {
      const x = s === "/3D/3dmodel.model" ? rot : tekst(s);
      filObj.set(s, x ? lesObjekter(x) : /* @__PURE__ */ new Map());
    }
    return filObj.get(s);
  };
  const samle = (sti, id, m, dybde = 0) => {
    if (dybde > 8) return [];
    const o = objekterI(sti).get(id);
    if (!o) return [];
    const ut = [];
    if (o.mesh) ut.push(transformer(o.mesh, m));
    for (const k of o.komponenter) ut.push(...samle(k.sti ?? sti, k.objectid, gang(m, k.m), dybde + 1));
    return ut;
  };
  const navn = /* @__PURE__ */ new Map();
  const ms = tekst("Metadata/model_settings.config");
  if (ms) {
    const ro = /<object id="(\d+)">\s*<metadata key="name" value="([^"]*)"/g;
    let m;
    while (m = ro.exec(ms)) navn.set(m[1], m[2]);
  }
  const deler = [];
  const bygg = rot.match(/<build\b[^>]*>([\s\S]*?)<\/build>/);
  const ri = /<item\b([^>]*)\/?>/g;
  let it;
  while (bygg && (it = ri.exec(bygg[1]))) {
    const id = attr(it[1], "objectid") ?? "";
    const biter = samle(null, id, lesMatrise(attr(it[1], "transform")));
    if (biter.length) deler.push({ navn: navn.get(id) ?? `Objekt ${id}`, nett: slaSammen(biter) });
  }
  let prosjekt = null;
  const ps = tekst("Metadata/project_settings.config");
  if (ps) {
    try {
      prosjekt = JSON.parse(ps);
    } catch {
      prosjekt = null;
    }
  }
  return { deler, prosjekt };
}
function fraTrekantsuppe(xyz) {
  const kart = /* @__PURE__ */ new Map();
  const pts = [];
  const tri = new Uint32Array(xyz.length / 3);
  for (let i = 0; i < xyz.length; i += 3) {
    const k = `${Math.round(xyz[i] * 1e4)},${Math.round(xyz[i + 1] * 1e4)},${Math.round(xyz[i + 2] * 1e4)}`;
    let idx = kart.get(k);
    if (idx === void 0) {
      idx = pts.length / 3;
      kart.set(k, idx);
      pts.push(xyz[i], xyz[i + 1], xyz[i + 2]);
    }
    tri[i / 3] = idx;
  }
  return { punkter: new Float32Array(pts), trekanter: tri };
}
function lesStl(data) {
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const antall = data.byteLength >= 84 ? dv.getUint32(80, true) : 0;
  let xyz;
  if (antall > 0 && 84 + antall * 50 === data.byteLength) {
    xyz = new Float32Array(antall * 9);
    for (let i = 0; i < antall; i++) {
      const o = 84 + i * 50 + 12;
      for (let k = 0; k < 9; k++) xyz[i * 9 + k] = dv.getFloat32(o + k * 4, true);
    }
  } else {
    const txt = strFromU8(data);
    const tall = [...txt.matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g)].flatMap((m) => [+m[1], +m[2], +m[3]]);
    if (tall.length < 9) throw new Error("Klarte ikke \xE5 lese STL-fila.");
    xyz = new Float32Array(tall);
  }
  let zmin = Infinity;
  for (let i = 2; i < xyz.length; i += 3) zmin = Math.min(zmin, xyz[i]);
  for (let i = 2; i < xyz.length; i += 3) xyz[i] -= zmin;
  return { deler: [{ navn: "Deksel", nett: fraTrekantsuppe(xyz) }], prosjekt: null };
}
function lesModell(data, filnavn) {
  const erZip = data[0] === 80 && data[1] === 75;
  if (erZip || /\.3mf$/i.test(filnavn)) return les3mf(data);
  return lesStl(data);
}

// src/lib/deksel/analyse.ts
var KANTAVSTAND = 2.2;
var LAG = 0.2;
function snitt(nett, z) {
  const p = nett.punkter;
  const t = nett.trekanter;
  const segmenter = [];
  for (let i = 0; i < t.length; i += 3) {
    const a = t[i] * 3, b = t[i + 1] * 3, c = t[i + 2] * 3;
    const pts = [a, b, c];
    const kryss = [];
    for (let k = 0; k < 3; k++) {
      const p1 = pts[k], p2 = pts[(k + 1) % 3];
      const z1 = p[p1 + 2] - z, z2 = p[p2 + 2] - z;
      if (z1 < 0 && z2 >= 0 || z1 >= 0 && z2 < 0) {
        const s = z1 / (z1 - z2);
        kryss.push([p[p1] + s * (p[p2] - p[p1]), p[p1 + 1] + s * (p[p2 + 1] - p[p1 + 1])]);
      }
    }
    if (kryss.length === 2) segmenter.push([kryss[0][0], kryss[0][1], kryss[1][0], kryss[1][1]]);
  }
  const nokkel = (x, y) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)}`;
  const fra = /* @__PURE__ */ new Map();
  segmenter.forEach((s, i) => {
    for (const k of [nokkel(s[0], s[1]), nokkel(s[2], s[3])]) {
      if (!fra.has(k)) fra.set(k, []);
      fra.get(k).push(i);
    }
  });
  const brukt = new Uint8Array(segmenter.length);
  const ringer = [];
  for (let start = 0; start < segmenter.length; start++) {
    if (brukt[start]) continue;
    brukt[start] = 1;
    const s0 = segmenter[start];
    const ring = [[s0[0], s0[1]], [s0[2], s0[3]]];
    let ende = nokkel(s0[2], s0[3]);
    const forste = nokkel(s0[0], s0[1]);
    for (let guard = 0; guard < segmenter.length; guard++) {
      if (ende === forste) break;
      const kandidater = fra.get(ende) ?? [];
      const neste = kandidater.find((j) => !brukt[j]);
      if (neste === void 0) break;
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
function areal(r) {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i];
    const [x2, y2] = r[(i + 1) % r.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}
function tyngdepunkt(r) {
  let x = 0, y = 0;
  for (const p of r) {
    x += p[0];
    y += p[1];
  }
  return [x / r.length, y / r.length];
}
function region(wasm2, ringer) {
  return wasm2.CrossSection.ofPolygons(ringer, "EvenOdd");
}
function mat3(m) {
  const [a, b, c, d, e, f] = m;
  return [a, d, 0, b, e, 0, c, f, 1];
}
function avrund(cs) {
  return cs.simplify(0.04).toPolygons().map((r) => r.map((p) => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]));
}
function somPolygoner(ringer) {
  const ytre = ringer.filter((r) => areal(r) > 0);
  const indre = ringer.filter((r) => areal(r) < 0);
  const inni = (pt, r) => {
    let inn = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j];
      if (yi > pt[1] !== yj > pt[1] && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) inn = !inn;
    }
    return inn;
  };
  return ytre.map((y) => [y, ...indre.filter((h) => inni(h[0], y))]);
}
function analyser(wasm2, deler) {
  if (!deler.length) throw new Error("Fila inneholder ingen modeller.");
  let kasseDel = 0, best = -1;
  deler.forEach((d, i) => {
    const g2 = grenser(d.nett);
    const a = (g2.maks[0] - g2.min[0]) * (g2.maks[1] - g2.min[1]);
    if (a > best) {
      best = a;
      kasseDel = i;
    }
  });
  const nett = deler[kasseDel].nett;
  const g = grenser(nett);
  if (g.min[2] > 0.05 || g.min[2] < -0.05) {
    throw new Error("Dekselet ligger ikke p\xE5 plata. Legg baksiden ned i Bambu Studio og eksporter p\xE5 nytt.");
  }
  const bunn = region(wasm2, snitt(nett, 0.05));
  const bunnAreal = bunn.area();
  const fot = (g.maks[0] - g.min[0]) * (g.maks[1] - g.min[1]);
  if (bunnAreal < fot * 0.5) {
    throw new Error(
      "Fant ingen flat bakside nede p\xE5 plata. Legg dekselet med baksiden ned i Bambu Studio og eksporter p\xE5 nytt."
    );
  }
  let tykkelse = 0;
  for (let z = 0.15; z < Math.min(4, g.maks[2]); z += 0.1) {
    const a = region(wasm2, snitt(nett, z)).area();
    if (a < bunnAreal * 0.5) {
      tykkelse = Math.round((z - 0.05) * 100) / 100;
      break;
    }
  }
  if (!tykkelse) tykkelse = 1;
  const dybde = Math.max(LAG * 2, Math.min(0.6, Math.floor((tykkelse - 0.4 + 1e-6) / LAG) * LAG));
  const bunnRinger = bunn.toPolygons();
  const hullPlate = bunnRinger.filter((r) => areal(r) < 0).sort((a, b) => areal(a) - areal(b));
  let samlet = bunn;
  for (let k = 1; k <= 6; k++) {
    const z = g.maks[2] * k / 7;
    const r = snitt(nett, z);
    if (r.length) samlet = wasm2.CrossSection.union(samlet, region(wasm2, r));
  }
  const silhuettSnitt = samlet.offset(0.01).offset(-0.01);
  const silRinger = silhuettSnitt.toPolygons().filter((r) => areal(r) > 0);
  silRinger.sort((a, b) => areal(b) - areal(a));
  const silhuettPlate = silRinger[0] ?? bunnRinger.filter((r) => areal(r) > 0)[0];
  const cx = (g.min[0] + g.maks[0]) / 2;
  const cy = (g.min[1] + g.maks[1]) / 2;
  const liggende = g.maks[0] - g.min[0] > g.maks[1] - g.min[1];
  let m = [-1, 0, cx, 0, 1, -cy];
  if (liggende) {
    m = [0, -1, cy, -1, 0, cx];
  }
  const kamera = hullPlate[0];
  if (kamera) {
    const [kx, ky] = tyngdepunkt(kamera);
    const v = m[3] * kx + m[4] * ky + m[5];
    if (v < 0) m = [-m[0], -m[1], -m[2], -m[3], -m[4], -m[5]];
  }
  const iVisning = (cs) => cs.transform(mat3(m));
  const somVisning = (r) => r.map(([x, y]) => [
    Math.round((m[0] * x + m[1] * y + m[2]) * 100) / 100,
    Math.round((m[3] * x + m[4] * y + m[5]) * 100) / 100
  ]);
  const bak = region(wasm2, snitt(nett, dybde + 0.25)).offset(-0.4, "Round");
  const trygg = iVisning(bunn.offset(-KANTAVSTAND, "Round").intersect(bak));
  const tryggRinger = avrund(trygg);
  const sil = somVisning(silhuettPlate);
  const us = sil.map((p) => p[0]);
  const vs = sil.map((p) => p[1]);
  return {
    versjon: 1,
    kasseDel,
    tilVisning: m,
    silhuett: sil,
    hull: hullPlate.map(somVisning).map((r) => r.reverse()),
    trygg: somPolygoner(tryggRinger),
    bredde: Math.round((Math.max(...us) - Math.min(...us)) * 100) / 100,
    hoyde: Math.round((Math.max(...vs) - Math.min(...vs)) * 100) / 100,
    tykkelse,
    dybde: Math.round(dybde * 100) / 100,
    trekanter: nett.trekanter.length / 3
  };
}

// src/lib/deksel/modellnavn.ts
var ORD = {
  pro: "Pro",
  max: "Max",
  plus: "Plus",
  mini: "mini",
  ultra: "Ultra",
  fe: "FE",
  edge: "Edge",
  air: "Air",
  se: "SE"
};
function navnFraFil(filnavn) {
  const base = (filnavn.split(/[\\/]/).pop() || filnavn).replace(/\.(stl|3mf)$/i, "").replace(/[_\s]+/g, "-").replace(/-(deksel|case|cover|v\d+|final)$/i, "").toLowerCase();
  const deler = base.split("-").filter(Boolean);
  if (deler[0] === "iphone") {
    const rest = deler.slice(1);
    if (rest[0] === "se") return "iPhone SE (2./3. gen)";
    return ["iPhone", ...rest.map((d) => ORD[d] ?? d)].join(" ");
  }
  if (deler[0] === "galaxy" || deler[0] === "samsung") {
    const rest = deler.slice(deler[0] === "samsung" && deler[1] === "galaxy" ? 2 : 1);
    const ut = [];
    for (const d of rest) {
      if (d === "plus" && ut.length) ut[ut.length - 1] += "+";
      else if (/^[sazm]\d+/i.test(d)) ut.push(d.toUpperCase());
      else ut.push(ORD[d] ?? d.charAt(0).toUpperCase() + d.slice(1));
    }
    return ["Samsung Galaxy", ...ut].join(" ");
  }
  return deler.map((d) => ORD[d] ?? d.charAt(0).toUpperCase() + d.slice(1)).join(" ");
}
function merkeFor(navn) {
  if (/^iphone/i.test(navn.trim())) return "iPhone";
  if (/^(samsung|galaxy)/i.test(navn.trim())) return "Samsung";
  return "Andre";
}
function rangering(navn) {
  const n = navn.toLowerCase();
  const merke = merkeFor(navn);
  const base = merke === "iPhone" ? 1e4 : merke === "Samsung" ? 2e4 : 3e4;
  const funnet = n.match(/(?:iphone\s*|galaxy\s*[a-z]?)(\d{1,2})/)?.[1];
  const tall = Number(funnet ?? (/iphone air/.test(n) ? 17 : /\bse\b/.test(n) ? 9 : 0));
  let variant = 2;
  if (merke === "iPhone") {
    if (/pro max/.test(n)) variant = 0;
    else if (/\bpro\b/.test(n)) variant = 1;
    else if (/\bair\b/.test(n)) variant = 2;
    else if (/plus/.test(n)) variant = 3;
    else if (/^iphone \d+\s*$/.test(n.trim())) variant = 4;
    else if (/mini/.test(n)) variant = 5;
    else if (/\d+e\b/.test(n)) variant = 6;
    else if (/\bse\b/.test(n)) variant = 7;
  } else if (merke === "Samsung") {
    if (/ultra/.test(n)) variant = 0;
    else if (/\+|plus/.test(n)) variant = 1;
    else if (/edge/.test(n)) variant = 3;
    else if (/\bfe\b/.test(n)) variant = 4;
  }
  return base + (99 - tall) * 10 + variant;
}

// .tmp-test/inngang.ts
var wasm = null;
async function analyserFil(bytes, filnavn) {
  if (!wasm) {
    wasm = await Module();
    wasm.setup();
  }
  return analyser(wasm, lesModell(bytes, filnavn).deler);
}
export {
  analyserFil,
  navnFraFil,
  rangering
};
