/**
 * Enkle, tydelige symboler kunden kan legge på dekselet.
 * Alle ligger i en boks på 24×24 med y nedover (som SVG), sentrert i (12,12).
 * Formene er bevisst kraftige, så de lar seg printe (tynne streker forsvinner).
 */

export type Symbol = { id: string; navn: string; d: string; regel: 'nonzero' | 'evenodd' };

const f = (n: number) => Math.round(n * 100) / 100;

function poly(pts: [number, number][], motsatt = false): string {
  const p = motsatt ? [...pts].reverse() : pts;
  return 'M' + p.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z';
}

function ellipse(cx: number, cy: number, rx: number, ry: number, motsatt = false): string {
  const s = motsatt ? 0 : 1;
  return `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 ${s} ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 ${s} ${f(-2 * rx)} 0Z`;
}
const sirkel = (cx: number, cy: number, r: number, motsatt = false) => ellipse(cx, cy, r, r, motsatt);

/** Rektangel fra (x1,y1) til (x2,y2), rotert grader rundt (cx,cy). */
function boks(x1: number, y1: number, x2: number, y2: number, grader = 0, cx = 12, cy = 12): string {
  const a = (grader * Math.PI) / 180;
  const rot = ([x, y]: [number, number]): [number, number] => [
    cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a),
    cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a),
  ];
  return poly(([[x1, y1], [x2, y1], [x2, y2], [x1, y2]] as [number, number][]).map(rot));
}

function stjerne(tagger: number, ytre: number, indre: number, cx = 12, cy = 12.6): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < tagger * 2; i++) {
    const r = i % 2 ? indre : ytre;
    const a = -Math.PI / 2 + (i * Math.PI) / tagger;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return poly(pts);
}

function sol(): string {
  let d = sirkel(12, 12, 5.2);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const b = 0.32;
    d += poly([
      [12 + 7 * Math.cos(a - b), 12 + 7 * Math.sin(a - b)],
      [12 + 11.3 * Math.cos(a), 12 + 11.3 * Math.sin(a)],
      [12 + 7 * Math.cos(a + b), 12 + 7 * Math.sin(a + b)],
    ]);
  }
  return d;
}

function snofnugg(): string {
  let d = '';
  for (let i = 0; i < 3; i++) d += boks(1, 11, 23, 13, i * 60);
  // en tverrstrek på hver arm
  for (let i = 0; i < 6; i++) d += boks(16, 8.2, 17.8, 15.8, i * 60);
  return d;
}

function blomst(): string {
  let d = '';
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - Math.PI / 2;
    d += sirkel(12 + 5.6 * Math.cos(a), 12 + 5.6 * Math.sin(a), 3.9);
  }
  return d + sirkel(12, 12, 3.4);
}

export const SYMBOLER: Symbol[] = [
  {
    id: 'hjerte',
    navn: 'Hjerte',
    regel: 'nonzero',
    d: 'M12 21.3C10.9 20.4 2 14.7 2 8.6 2 5.4 4.4 3 7.4 3c2 0 3.6 1 4.6 2.6C13 4 14.6 3 16.6 3 19.6 3 22 5.4 22 8.6c0 6.1-8.9 11.8-10 12.7Z',
  },
  { id: 'stjerne', navn: 'Stjerne', regel: 'nonzero', d: stjerne(5, 11, 4.7) },
  { id: 'lyn', navn: 'Lyn', regel: 'nonzero', d: 'M14 1.5 3.8 13.6h6.6L8.8 22.5 20.2 9.8h-6.7Z' },
  {
    id: 'smil',
    navn: 'Smilefjes',
    regel: 'evenodd',
    d:
      sirkel(12, 12, 10.5) +
      ellipse(8.4, 9.2, 1.6, 2.1) +
      ellipse(15.6, 9.2, 1.6, 2.1) +
      'M6.6 13.2h10.8a5.4 5.4 0 0 1-10.8 0Z',
  },
  { id: 'sol', navn: 'Sol', regel: 'nonzero', d: sol() },
  { id: 'maane', navn: 'Måne', regel: 'nonzero', d: 'M15.2 2.2A10 10 0 1 0 21.8 16 8 8 0 0 1 15.2 2.2Z' },
  {
    id: 'krone',
    navn: 'Krone',
    regel: 'nonzero',
    d: 'M2.2 7.2 7.6 11.6 12 3.8l4.4 7.8 5.4-4.4-2 10.6H4.2Z' + boks(4.2, 19.4, 19.8, 21.8, 0),
  },
  {
    id: 'note',
    navn: 'Note',
    regel: 'nonzero',
    d:
      ellipse(6.6, 18.4, 3.6, 2.8) +
      ellipse(17.4, 16, 3.6, 2.8) +
      poly([[8.4, 18.4], [8.4, 5.6], [21, 2.6], [21, 16], [19.2, 16], [19.2, 7.6], [10.2, 9.7], [10.2, 18.4]]),
  },
  {
    id: 'pote',
    navn: 'Pote',
    regel: 'nonzero',
    d:
      ellipse(12, 16.4, 5.6, 4.6) +
      ellipse(4.8, 10.2, 2.2, 2.8) +
      ellipse(9.2, 5.8, 2.3, 3) +
      ellipse(14.8, 5.8, 2.3, 3) +
      ellipse(19.2, 10.2, 2.2, 2.8),
  },
  { id: 'blomst', navn: 'Blomst', regel: 'nonzero', d: blomst() },
  {
    id: 'sky',
    navn: 'Sky',
    regel: 'nonzero',
    d: sirkel(7, 14, 4.6) + sirkel(12.4, 10.4, 5.8) + sirkel(17.4, 13.8, 4.6) + boks(7, 13.8, 17.4, 18.6, 0),
  },
  {
    id: 'flamme',
    navn: 'Flamme',
    regel: 'nonzero',
    d: 'M12 1.2c1.2 4.2 6.6 6.6 6.6 13a6.6 6.6 0 0 1-13.2 0c0-3.3 1.6-5.3 3.3-6.6.2 2.2 1.1 3.3 2.4 3.8C10.6 7.8 10.6 4.4 12 1.2Z',
  },
  { id: 'pil', navn: 'Pil', regel: 'nonzero', d: poly([[1.5, 9.6], [13, 9.6], [13, 4.2], [22.5, 12], [13, 19.8], [13, 14.4], [1.5, 14.4]]) },
  { id: 'diamant', navn: 'Diamant', regel: 'nonzero', d: poly([[6.2, 3], [17.8, 3], [22.4, 9.2], [12, 21.6], [1.6, 9.2]]) },
  {
    id: 'spokelse',
    navn: 'Spøkelse',
    regel: 'evenodd',
    d:
      'M4.4 22.2V11a7.6 7.6 0 0 1 15.2 0v11.2l-2.5-2.2-2.6 2.2-2.5-2.2-2.5 2.2-2.6-2.2Z' +
      ellipse(9.2, 10.6, 1.5, 2.1) +
      ellipse(14.8, 10.6, 1.5, 2.1),
  },
  {
    id: 'gresskar',
    navn: 'Gresskar',
    regel: 'nonzero',
    d:
      ellipse(7.6, 14.4, 5.4, 7.2) +
      ellipse(16.4, 14.4, 5.4, 7.2) +
      ellipse(12, 14.4, 5.2, 7.6) +
      poly([[11, 7.4], [11.2, 3.2], [14.4, 1.6], [14.8, 2.8], [13, 4], [13, 7.4]]),
  },
  {
    id: 'juletre',
    navn: 'Juletre',
    regel: 'nonzero',
    d:
      poly([[12, 1.4], [17.2, 8], [14.8, 8], [19.6, 14], [16.9, 14], [21.6, 20], [2.4, 20], [7.1, 14], [4.4, 14], [9.2, 8], [6.8, 8]]) +
      boks(10.2, 19.6, 13.8, 23, 0),
  },
  { id: 'snofnugg', navn: 'Snøfnugg', regel: 'nonzero', d: snofnugg() },
  {
    id: 'hake',
    navn: 'Hake',
    regel: 'nonzero',
    d: poly([[2.2, 12.6], [5.2, 9.6], [9.4, 13.8], [18.8, 4.4], [21.8, 7.4], [9.4, 19.8]]),
  },
  {
    id: 'fotball',
    navn: 'Ball',
    regel: 'evenodd',
    d:
      sirkel(12, 12, 10.6) +
      poly([[12, 7.2], [16.2, 10.2], [14.6, 15.2], [9.4, 15.2], [7.8, 10.2]]) +
      poly([[12, 1.6], [14.4, 3.4], [12, 4.6], [9.6, 3.4]]),
  },
];

export function symbol(id: string): Symbol {
  return SYMBOLER.find((s) => s.id === id) ?? SYMBOLER[0];
}
