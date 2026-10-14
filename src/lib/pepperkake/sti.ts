/**
 * Streken kunden tegner, gjort om til én ren linje (midten av pennestreken).
 * Koordinater i mm på tegneflaten: x mot høyre, y nedover (som på skjermen).
 *
 * Flere streker kobles til én form: en ny strek fester seg til nærmeste ende
 * (snapper hvis den starter eller slutter nær en ende). Møtes endene, lukkes
 * formen. En åpen form kan også bestilles – kunden får bare en advarsel.
 */
export type Pkt = [number, number];
export type Form = { punkter: Pkt[]; lukket: boolean };

/** Hvor nær en ende man må være for å feste seg til den (mm). */
export const SNAP_MM = 7;
/** Største antall punkter vi tar vare på (holder modellen rask å lage). */
const MAKS_PUNKTER = 500;

const avst = (a: Pkt, b: Pkt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Lengden av en linje (mm). */
export function lengde(p: Pkt[]): number {
  let s = 0;
  for (let i = 1; i < p.length; i++) s += avst(p[i - 1], p[i]);
  return s;
}

/** Ramer–Douglas–Peucker: fjern punkter som ligger nesten på en rett linje. */
function forenkle(p: Pkt[], toleranse: number): Pkt[] {
  if (p.length < 3) return p.slice();
  const behold = new Uint8Array(p.length);
  behold[0] = behold[p.length - 1] = 1;
  const stabel: [number, number][] = [[0, p.length - 1]];
  while (stabel.length) {
    const [a, b] = stabel.pop()!;
    const [ax, ay] = p[a], [bx, by] = p[b];
    const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1e-9;
    let maks = -1, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((p[i][0] - ax) * dy - (p[i][1] - ay) * dx) / l;
      if (d > maks) { maks = d; idx = i; }
    }
    if (maks > toleranse && idx > 0) {
      behold[idx] = 1;
      stabel.push([a, idx], [idx, b]);
    }
  }
  return p.filter((_, i) => behold[i]);
}

/** Chaikin-glatting (beholder endepunktene). */
function glatt(p: Pkt[], runder = 2): Pkt[] {
  let q = p;
  for (let r = 0; r < runder && q.length > 2; r++) {
    const ut: Pkt[] = [q[0]];
    for (let i = 0; i < q.length - 1; i++) {
      const [x0, y0] = q[i], [x1, y1] = q[i + 1];
      ut.push([0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1], [0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1]);
    }
    ut.push(q[q.length - 1]);
    q = ut;
  }
  return q;
}

/** En frihåndsstrek → ren, jevn linje. */
export function renStrek(raa: Pkt[]): Pkt[] {
  // fjern punkter som ligger oppå hverandre
  const p: Pkt[] = [];
  for (const q of raa) if (!p.length || avst(p[p.length - 1], q) > 0.15) p.push(q);
  if (p.length < 2) return p;
  return forenkle(glatt(p, 2), 0.18);
}

function begrens(p: Pkt[]): Pkt[] {
  let t = 0.18, q = p;
  while (q.length > MAKS_PUNKTER && t < 3) { t *= 1.5; q = forenkle(p, t); }
  return q;
}

/** Klemmer et punkt inn på tegneflaten. */
export function innenfor(p: Pkt, maks: number): Pkt {
  return [Math.min(maks, Math.max(0, p[0])), Math.min(maks, Math.max(0, p[1]))];
}

/** Lukk formen hvis endene møtes. */
function provLukk(p: Pkt[], snap: number): Form {
  if (p.length >= 4 && lengde(p) > snap * 4 && avst(p[0], p[p.length - 1]) <= snap) {
    return { punkter: begrens(p.slice(0, -1)), lukket: true };
  }
  return { punkter: begrens(p), lukket: false };
}

/** Hvilken ende av formen en ny strek vil feste seg til (eller null). */
export function naermesteEnde(form: Form, p: Pkt): { ende: 'start' | 'slutt'; punkt: Pkt; avstand: number } | null {
  if (form.lukket || !form.punkter.length) return null;
  const a = form.punkter[0], b = form.punkter[form.punkter.length - 1];
  const da = avst(p, a), db = avst(p, b);
  return db <= da ? { ende: 'slutt', punkt: b, avstand: db } : { ende: 'start', punkt: a, avstand: da };
}

/**
 * Legg en ny (allerede renset) strek til formen.
 * - Starter eller slutter streken nær en ende, festes den der.
 * - Ellers kobles den til nærmeste ende med en rett strek.
 */
export function leggTil(form: Form, strek: Pkt[], snap = SNAP_MM): Form {
  if (strek.length < 2 || form.lukket) return form;
  if (!form.punkter.length) return provLukk(strek, snap);

  let s = strek.slice();
  const fraStart = naermesteEnde(form, s[0])!;
  const fraSlutt = naermesteEnde(form, s[s.length - 1])!;
  // tegnet «mot» formen? snu streken så den starter ved formen
  if (fraSlutt.avstand < fraStart.avstand && fraSlutt.avstand <= snap) s = s.reverse();
  const feste = naermesteEnde(form, s[0])!;
  if (feste.avstand <= snap) s[0] = feste.punkt; // snap rett på enden

  let p: Pkt[];
  if (feste.ende === 'slutt') p = [...form.punkter, ...(feste.avstand <= snap ? s.slice(1) : s)];
  else p = [...(feste.avstand <= snap ? s.slice(1) : s).reverse(), ...form.punkter];
  return provLukk(p, snap);
}

/** Kan endene kobles sammen med en rett strek? */
export function kanLukkes(form: Form): boolean {
  return !form.lukket && form.punkter.length >= 3 && lengde(form.punkter) > SNAP_MM * 4;
}

/** Lukk formen med en rett strek mellom endene. */
export function lukk(form: Form): Form {
  if (!kanLukkes(form)) return form;
  const p = form.punkter;
  // ligger endene nesten oppå hverandre, dropp det siste punktet
  const punkter = avst(p[0], p[p.length - 1]) < 0.5 ? p.slice(0, -1) : p.slice();
  return { punkter, lukket: punkter.length >= 3 };
}

/** Deler linja opp i punkter med jevn avstand (mm). */
function jevnAvstand(p: Pkt[], lukket: boolean, steg: number): Pkt[] {
  const q = lukket ? [...p, p[0]] : p;
  const ut: Pkt[] = [q[0]];
  let rest = steg;
  for (let i = 1; i < q.length; i++) {
    let [ax, ay] = q[i - 1];
    const [bx, by] = q[i];
    let l = Math.hypot(bx - ax, by - ay);
    while (l >= rest) {
      const t = rest / l;
      ax += (bx - ax) * t; ay += (by - ay) * t;
      ut.push([ax, ay]);
      l -= rest;
      rest = steg;
    }
    rest -= l;
  }
  if (lukket) {
    // siste punkt ligger oppå det første
    if (ut.length > 2 && avst(ut[ut.length - 1], ut[0]) < steg * 0.5) ut.pop();
  } else {
    const siste = p[p.length - 1];
    if (avst(ut[ut.length - 1], siste) > 1e-6) ut.push([siste[0], siste[1]]);
  }
  return ut;
}

/**
 * «Glatt ut»: gjør hele tegningen jevnere uten at den krymper (Taubin-glatting).
 * Endene på en åpen form står stille. Kan trykkes flere ganger.
 */
export function glattUt(form: Form, styrke = 18): Form {
  if (form.punkter.length < 3) return form;
  const lengden = lengde(form.punkter) + (form.lukket ? avst(form.punkter[0], form.punkter[form.punkter.length - 1]) : 0);
  const steg = Math.max(1.5, lengden / 300);
  let p = jevnAvstand(form.punkter, form.lukket, steg);
  const n = p.length;
  if (n < 4) return form;
  const lukket = form.lukket;
  const runde = (faktor: number) => {
    const ny: Pkt[] = new Array(n);
    for (let i = 0; i < n; i++) {
      if (!lukket && (i === 0 || i === n - 1)) { ny[i] = p[i]; continue; }
      const a = p[(i - 1 + n) % n], b = p[(i + 1) % n];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      ny[i] = [p[i][0] + faktor * (mx - p[i][0]), p[i][1] + faktor * (my - p[i][1])];
    }
    p = ny;
  };
  for (let k = 0; k < styrke; k++) { runde(0.6); runde(-0.63); }
  const punkter = begrens(forenkle(p.map((q) => innenfor(q, 200)), 0.1));
  return { punkter, lukket: lukket && punkter.length >= 3 };
}

/** SVG-sti for formen (koordinater i mm). */
export function svgSti(form: Form): string {
  const p = form.punkter;
  if (!p.length) return '';
  let d = `M${p[0][0].toFixed(2)} ${p[0][1].toFixed(2)}`;
  for (let i = 1; i < p.length; i++) d += `L${p[i][0].toFixed(2)} ${p[i][1].toFixed(2)}`;
  return form.lukket ? d + 'Z' : d;
}

/** Sjekker og rydder en form som kommer utenfra (fra handlekurven eller serveren). */
export function rensForm(data: unknown, maks = 200): Form | null {
  const d = data as { punkter?: unknown; lukket?: unknown } | null;
  if (!d || !Array.isArray(d.punkter)) return null;
  const p: Pkt[] = [];
  for (const q of d.punkter.slice(0, 4000)) {
    if (!Array.isArray(q) || q.length < 2) continue;
    const x = Number(q[0]), y = Number(q[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    p.push([Math.round(Math.min(maks, Math.max(0, x)) * 100) / 100, Math.round(Math.min(maks, Math.max(0, y)) * 100) / 100]);
  }
  if (p.length < 2) return null;
  return { punkter: begrens(p), lukket: Boolean(d.lukket) && p.length >= 3 };
}
