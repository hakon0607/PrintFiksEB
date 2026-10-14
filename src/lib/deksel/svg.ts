/** Hjelpere for å tegne dekselet som SVG (visning sett utenfra: u mot høyre, v opp). */
import type { Ring } from './analyse';

/** SVG har y nedover – vi snur v. */
export function sti(ringer: Ring[]): string {
  return ringer
    .map((r) => 'M' + r.map(([u, v]) => `${u.toFixed(2)} ${(-v).toFixed(2)}`).join('L') + 'Z')
    .join('');
}

export type Rammer = { u0: number; v0: number; bredde: number; hoyde: number };

export function rammer(silhuett: Ring): Rammer {
  const us = silhuett.map((p) => p[0]);
  const vs = silhuett.map((p) => p[1]);
  const u0 = Math.min(...us), v0 = Math.max(...vs);
  return { u0, v0, bredde: Math.max(...us) - u0, hoyde: v0 - Math.min(...vs) };
}
