/**
 * Navn og rekkefølge for mobilmodeller, gjettet fra filnavnet.
 *   iphone-16-pro-max.stl     -> «iPhone 16 Pro Max»
 *   galaxy-s25-ultra.3mf      -> «Samsung Galaxy S25 Ultra»
 * Rekkefølgen: iPhone først, så Samsung, nyeste modell øverst.
 */

export type Merke = 'iPhone' | 'Samsung' | 'Andre';

const ORD: Record<string, string> = {
  pro: 'Pro', max: 'Max', plus: 'Plus', mini: 'mini', ultra: 'Ultra', fe: 'FE', edge: 'Edge', air: 'Air', se: 'SE',
};

/** «iphone-16-pro-max.stl» -> «iPhone 16 Pro Max». Ukjente navn blir pent formatert. */
export function navnFraFil(filnavn: string): string {
  const base = (filnavn.split(/[\\/]/).pop() || filnavn)
    .replace(/\.(stl|3mf)$/i, '')
    .replace(/[_\s]+/g, '-')
    .replace(/-(deksel|case|cover|v\d+|final)$/i, '')
    .toLowerCase();
  const deler = base.split('-').filter(Boolean);

  if (deler[0] === 'iphone') {
    const rest = deler.slice(1);
    if (rest[0] === 'se') return 'iPhone SE (2./3. gen)';
    return ['iPhone', ...rest.map((d) => ORD[d] ?? d)].join(' ');
  }

  if (deler[0] === 'galaxy' || deler[0] === 'samsung') {
    const rest = deler.slice(deler[0] === 'samsung' && deler[1] === 'galaxy' ? 2 : 1);
    const ut: string[] = [];
    for (const d of rest) {
      if (d === 'plus' && ut.length) ut[ut.length - 1] += '+';
      else if (/^[sazm]\d+/i.test(d)) ut.push(d.toUpperCase());
      else ut.push(ORD[d] ?? d.charAt(0).toUpperCase() + d.slice(1));
    }
    return ['Samsung Galaxy', ...ut].join(' ');
  }

  return deler.map((d) => ORD[d] ?? d.charAt(0).toUpperCase() + d.slice(1)).join(' ');
}

export function merkeFor(navn: string): Merke {
  if (/^iphone/i.test(navn.trim())) return 'iPhone';
  if (/^(samsung|galaxy)/i.test(navn.trim())) return 'Samsung';
  return 'Andre';
}

/** Sorteringstall: lavt = øverst. Nyeste modell først innen hvert merke. */
export function rangering(navn: string): number {
  const n = navn.toLowerCase();
  const merke = merkeFor(navn);
  const base = merke === 'iPhone' ? 10000 : merke === 'Samsung' ? 20000 : 30000;
  const funnet = n.match(/(?:iphone\s*|galaxy\s*[a-z]?)(\d{1,2})/)?.[1];
  // iPhone Air kom sammen med iPhone 17, SE sorteres sist
  const tall = Number(funnet ?? (/iphone air/.test(n) ? 17 : /\bse\b/.test(n) ? 9 : 0));
  let variant = 2;
  if (merke === 'iPhone') {
    if (/pro max/.test(n)) variant = 0;
    else if (/\bpro\b/.test(n)) variant = 1;
    else if (/\bair\b/.test(n)) variant = 2;
    else if (/plus/.test(n)) variant = 3;
    else if (/^iphone \d+\s*$/.test(n.trim())) variant = 4;
    else if (/mini/.test(n)) variant = 5;
    else if (/\d+e\b/.test(n)) variant = 6;
    else if (/\bse\b/.test(n)) variant = 7;
  } else if (merke === 'Samsung') {
    if (/ultra/.test(n)) variant = 0;
    else if (/\+|plus/.test(n)) variant = 1;
    else if (/edge/.test(n)) variant = 3;
    else if (/\bfe\b/.test(n)) variant = 4;
  }
  return base + (99 - tall) * 10 + variant;
}

/** Sorterer og grupperer modeller etter merke, i rekkefølgen kunden ser dem. */
export function grupperEtterMerke<T extends { navn: string }>(liste: T[]): { merke: Merke; modeller: T[] }[] {
  const grupper: { merke: Merke; modeller: T[] }[] = [];
  for (const m of liste) {
    const merke = merkeFor(m.navn);
    let g = grupper.find((x) => x.merke === merke);
    if (!g) grupper.push((g = { merke, modeller: [] }));
    g.modeller.push(m);
  }
  const rek: Merke[] = ['iPhone', 'Samsung', 'Andre'];
  return grupper.sort((a, b) => rek.indexOf(a.merke) - rek.indexOf(b.merke));
}
