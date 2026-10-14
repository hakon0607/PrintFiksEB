/**
 * Fontene kunden kan skrive med på dekselet. Filene ligger på vår egen
 * server (public/deksel/fonter) – ingen kall til Google. Alle er OFL/Apache.
 * Valgt fordi de er kraftige nok til å printes (tynne fonter forsvinner).
 */

export type Font = { id: string; navn: string; familie: string; fil: string; vekt: number };

export const FONTER: Font[] = [
  { id: 'inter', navn: 'Klassisk', familie: 'PF Inter', fil: 'inter-latin-800-normal.woff2', vekt: 800 },
  { id: 'bebas', navn: 'Høy og fet', familie: 'PF Bebas Neue', fil: 'bebas-neue-latin-400-normal.woff2', vekt: 400 },
  { id: 'anton', navn: 'Plakat', familie: 'PF Anton', fil: 'anton-latin-400-normal.woff2', vekt: 400 },
  { id: 'fredoka', navn: 'Rund', familie: 'PF Fredoka', fil: 'fredoka-latin-700-normal.woff2', vekt: 700 },
  { id: 'bungee', navn: 'Blokk', familie: 'PF Bungee', fil: 'bungee-latin-400-normal.woff2', vekt: 400 },
  { id: 'righteous', navn: 'Retro', familie: 'PF Righteous', fil: 'righteous-latin-400-normal.woff2', vekt: 400 },
  { id: 'pacifico', navn: 'Skrift', familie: 'PF Pacifico', fil: 'pacifico-latin-400-normal.woff2', vekt: 400 },
  { id: 'lobster', navn: 'Lobster', familie: 'PF Lobster', fil: 'lobster-latin-400-normal.woff2', vekt: 400 },
  { id: 'marker', navn: 'Tusj', familie: 'PF Permanent Marker', fil: 'permanent-marker-latin-400-normal.woff2', vekt: 400 },
  { id: 'army', navn: 'Sjablong', familie: 'PF Black Ops One', fil: 'black-ops-one-latin-400-normal.woff2', vekt: 400 },
  { id: 'pixel', navn: 'Piksel', familie: 'PF Press Start 2P', fil: 'press-start-2p-latin-400-normal.woff2', vekt: 400 },
  { id: 'creepy', navn: 'Skummel', familie: 'PF Creepster', fil: 'creepster-latin-400-normal.woff2', vekt: 400 },
  { id: 'jul', navn: 'Jul', familie: 'PF Mountains of Christmas', fil: 'mountains-of-christmas-latin-700-normal.woff2', vekt: 700 },
];

export function font(id: string): Font {
  return FONTER.find((f) => f.id === id) ?? FONTER[0];
}

const lastet = new Map<string, Promise<void>>();

/** Laster en font én gang. Etterpå kan både SVG og canvas bruke den. */
export function lastFont(id: string): Promise<void> {
  const ft = font(id);
  if (typeof window === 'undefined' || typeof FontFace === 'undefined') return Promise.resolve();
  let p = lastet.get(ft.id);
  if (!p) {
    const ff = new FontFace(ft.familie, `url(/deksel/fonter/${ft.fil}) format("woff2")`, {
      weight: String(ft.vekt),
      display: 'block',
    });
    p = ff
      .load()
      .then((f) => {
        document.fonts.add(f);
      })
      .catch(() => {
        lastet.delete(ft.id);
      });
    lastet.set(ft.id, p);
  }
  return p;
}

export function cssFont(id: string, storrelse: number): string {
  const ft = font(id);
  return `${ft.vekt} ${storrelse}px "${ft.familie}", system-ui, sans-serif`;
}
