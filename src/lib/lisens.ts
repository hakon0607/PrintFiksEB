/**
 * Leser ut lisensen fra en modellside, og sier om vi har lov til å selge
 * det vi printer.
 *
 * Kort fortalt:
 *  - CC0 og CC-BY og CC-BY-SA: lov å selge, men BY krever at vi oppgir
 *    designeren og lenker til originalen.
 *  - Alt med NC (NonCommercial): ikke lov å selge prints.
 *  - ND (NoDerivatives): lov å selge, men vi kan ikke endre modellen.
 */
export type Lisensdom = {
  /** Slik lisensen står på siden, f.eks. «CC BY-NC 4.0». */
  navn: string;
  /** ja = lov å selge, nei = ikke lov, ukjent = fant den ikke */
  salg: 'ja' | 'nei' | 'ukjent';
  /** Må vi kreditere designeren? */
  kreverKreditering: boolean;
  /** Én setning vi viser i admin. */
  forklaring: string;
};

const MONSTRE: { re: RegExp; navn: string }[] = [
  { re: /\bCC0\b|public\s*domain/i, navn: 'CC0' },
  { re: /CC[\s-]*BY[\s-]*NC[\s-]*SA/i, navn: 'CC BY-NC-SA' },
  { re: /CC[\s-]*BY[\s-]*NC[\s-]*ND/i, navn: 'CC BY-NC-ND' },
  { re: /CC[\s-]*BY[\s-]*NC/i, navn: 'CC BY-NC' },
  { re: /CC[\s-]*BY[\s-]*SA/i, navn: 'CC BY-SA' },
  { re: /CC[\s-]*BY[\s-]*ND/i, navn: 'CC BY-ND' },
  { re: /CC[\s-]*BY\b/i, navn: 'CC BY' },
  { re: /non[\s-]*commercial/i, navn: 'NonCommercial' },
];

export function lesLisens(html: string): Lisensdom {
  // Se bare der lisensen pleier å stå, ikke i hele sida
  const biter = [
    ...(html.match(/"license"\s*:\s*"[^"]{0,120}"/gi) ?? []),
    ...(html.match(/licen[cs]e[^<>{}]{0,160}/gi) ?? []).slice(0, 40),
    ...(html.match(/creativecommons\.org\/licenses\/[a-z-]+/gi) ?? []),
  ].join(' ');

  const lenke = html.match(/creativecommons\.org\/licenses\/([a-z-]+)/i);
  let navn = '';
  if (lenke) {
    navn = `CC ${lenke[1].toUpperCase()}`;
  } else {
    for (const m of MONSTRE) {
      if (m.re.test(biter)) {
        navn = m.navn;
        break;
      }
    }
  }

  if (!navn) {
    return {
      navn: '',
      salg: 'ukjent',
      kreverKreditering: true,
      forklaring:
        'Fant ingen lisens på siden. Sjekk den selv før dere legger modellen ut for salg.',
    };
  }

  const nc = /NC|non[\s-]*commercial/i.test(navn);
  const by = /BY/i.test(navn);
  const nd = /ND/i.test(navn);

  if (nc) {
    return {
      navn,
      salg: 'nei',
      kreverKreditering: true,
      forklaring: `${navn} betyr ikke-kommersiell. Dere kan printe den til dere selv, men ikke selge den.`,
    };
  }

  return {
    navn,
    salg: 'ja',
    kreverKreditering: by,
    forklaring: by
      ? `${navn} tillater salg, så lenge designeren krediteres og dere lenker til originalen.${
          nd ? ' ND betyr at modellen ikke kan endres.' : ''
        }`
      : `${navn} tillater salg, uten krav om kreditering.`,
  };
}
