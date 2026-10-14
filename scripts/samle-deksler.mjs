/**
 * Kjøres automatisk før hver bygging (se "build" i package.json).
 *
 * Finner alle dekselfiler som er lastet opp til GitHub – uansett hvilken mappe de
 * ligger i – med navn som iphone-16-pro.stl eller galaxy-s25-ultra.stl. Hver fil:
 *   1. kopieres til public/deksel/modeller/ så nettsiden kan hente den,
 *   2. analyseres (bakside, kamerahull, trygg sone) -> public/deksel/modeller/<navn>.json,
 *   3. føres opp i src/lib/deksel/innebygde.json med kundenavn og rekkefølge.
 *
 * Nye mobiler: last opp fila til GitHub med samme type navn – mer trengs ikke.
 * Feiler noe, hoppes den fila over og byggingen fortsetter.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UT = path.join(ROT, 'public', 'deksel', 'modeller');
const LISTE = path.join(ROT, 'src', 'lib', 'deksel', 'innebygde.json');
const HOPP_OVER = new Set(['node_modules', '.next', '.git', '.vercel', 'out', 'build']);
const MONSTER = /^(iphone|galaxy|samsung)[-_ a-z0-9()+.]*\.(stl|3mf)$/i;

async function finnFiler(mappe, funnet = []) {
  let innhold;
  try { innhold = await fs.readdir(mappe, { withFileTypes: true }); } catch { return funnet; }
  for (const e of innhold) {
    const full = path.join(mappe, e.name);
    if (e.isDirectory()) {
      if (HOPP_OVER.has(e.name) || full === UT) continue;
      await finnFiler(full, funnet);
    } else if (MONSTER.test(e.name)) {
      funnet.push(full);
    }
  }
  return funnet;
}

/** ASCII-STL fra OpenSCAD er 5–6 ganger større enn binær – gjør om så kundene laster raskere. */
function tilBinarStl(bytes) {
  const start = new TextDecoder().decode(bytes.subarray(0, 512)).trimStart();
  if (!start.startsWith('solid')) return bytes;
  const tekst = new TextDecoder().decode(bytes);
  if (!/facet\s+normal/.test(tekst)) return bytes; // binær fil som tilfeldigvis starter med «solid»
  const tall = tekst.match(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g) ?? [];
  const n = Math.floor(tall.length / 3);
  const ut = new ArrayBuffer(84 + n * 50);
  const dv = new DataView(ut);
  dv.setUint32(80, n, true);
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50;
    for (let k = 0; k < 3; k++) {
      const [, x, y, z] = tall[i * 3 + k].split(/\s+/);
      dv.setFloat32(o + 12 + k * 12, Number(x), true);
      dv.setFloat32(o + 16 + k * 12, Number(y), true);
      dv.setFloat32(o + 20 + k * 12, Number(z), true);
    }
  }
  return new Uint8Array(ut);
}

function slug(filnavn) {
  return filnavn.replace(/\.(stl|3mf)$/i, '').toLowerCase().replace(/\s*\(\d+\)$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  const start = Date.now();
  const filer = await finnFiler(ROT);
  // ta også med filer som alt ligger i public/deksel/modeller
  try {
    for (const f of await fs.readdir(UT)) if (MONSTER.test(f)) filer.push(path.join(UT, f));
  } catch { /* mappa finnes ikke ennå */ }

  if (filer.length === 0) {
    console.log('[deksler] Fant ingen dekselfiler i repoet – bruker bare mobilene i databasen.');
    await fs.writeFile(LISTE, '[]\n');
    return;
  }

  let verktoy;
  try {
    verktoy = await import('./deksel-analyse.mjs');
  } catch (e) {
    console.warn('[deksler] Klarte ikke å laste analysen – hopper over dekselfilene:', e?.message ?? e);
    await fs.writeFile(LISTE, '[]\n');
    return;
  }

  await fs.mkdir(UT, { recursive: true });
  const sett = new Map();
  for (const kilde of filer) {
    const filnavn = path.basename(kilde);
    const s = slug(filnavn);
    if (!s || sett.has(s)) continue;
    try {
      const endelse = filnavn.split('.').pop().toLowerCase();
      let bytes = new Uint8Array(await fs.readFile(kilde));
      if (endelse === 'stl') bytes = tilBinarStl(bytes);
      const analyse = await verktoy.analyserFil(bytes, filnavn);
      const malfil = `${s}.${endelse}`;
      await fs.writeFile(path.join(UT, malfil), bytes);
      await fs.writeFile(path.join(UT, `${s}.json`), JSON.stringify(analyse));
      const navn = verktoy.navnFraFil(filnavn);
      sett.set(s, {
        id: `fil:${s}`,
        navn,
        fil_url: `/deksel/modeller/${malfil}`,
        fil_navn: filnavn,
        analyse_url: `/deksel/modeller/${s}.json`,
        sort: verktoy.rangering(navn),
      });
    } catch (e) {
      console.warn(`[deksler] Hopper over ${filnavn}: ${e?.message ?? e}`);
    }
  }

  const liste = [...sett.values()].sort((a, b) => a.sort - b.sort || a.navn.localeCompare(b.navn, 'nb'));
  await fs.writeFile(LISTE, JSON.stringify(liste, null, 1) + '\n');
  console.log(`[deksler] ${liste.length} mobiler klare fra repoet (${((Date.now() - start) / 1000).toFixed(1)} s).`);
}

main().catch((e) => {
  // byggingen skal aldri stoppe på grunn av dekselfilene
  console.warn('[deksler] Uventet feil:', e?.message ?? e);
});
