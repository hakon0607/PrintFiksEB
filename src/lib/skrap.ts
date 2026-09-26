/** Plukker ut felter fra HTML-en på en modellside. */
export function meta(html: string, ...navn: string[]): string {
  for (const n of navn) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${n}["'][^>]+content=["']([^"']*)["']`,
      'i'
    );
    const m = html.match(re);
    if (m?.[1]) return avkod(m[1]);
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${n}["']`,
      'i'
    );
    const m2 = html.match(re2);
    if (m2?.[1]) return avkod(m2[1]);
  }
  return '';
}

export function avkod(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;|&apos;/g, "'")
    .trim();
}

/** Leter etter hvor mye filament modellen bruker. */
export function finnVekt(html: string): number | null {
  const monstre = [
    /"(?:filament|material)(?:Weight|Used|Usage)"\s*:\s*"?([\d.]+)/i,
    /"weight"\s*:\s*"?([\d.]+)/i,
    /([\d.]+)\s*(?:g|gram|grams)\b[^<>{}]{0,30}(?:filament|material)/i,
    /(?:filament|material)[^<>{}]{0,30}?([\d.]+)\s*(?:g|gram|grams)\b/i,
  ];
  for (const re of monstre) {
    const m = html.match(re);
    if (m?.[1]) {
      const v = Number(m[1]);
      if (Number.isFinite(v) && v >= 1 && v <= 5000) return Math.round(v);
    }
  }
  return null;
}

export function finnDesigner(html: string, nettsted: string): string {
  const kandidater = [
    // Først den enkle formen: "author": "Navn"
    (html.match(/"(?:designer|author|creator|uploader)"\s*:\s*"([^"]{2,60})"/i) ?? [])[1],
    // Så den nøstede: "designer": { "name": "Navn" }
    (html.match(
      /"(?:designer|author|creator|uploader)"\s*:\s*\{[^{}]{0,200}?"(?:name|handle|nickname|username)"\s*:\s*"([^"]{2,60})"/i
    ) ?? [])[1],
    meta(html, 'author', 'article:author'),
    // Innlimt tekst: en linje som bare sier «by Navn» eller «Designed by Navn»
    (html.match(/^\s*(?:designed\s+by|created\s+by|by|av)\s+([\p{L}\p{N}_\-. ]{2,40})\s*$/imu) ?? [])[1],
    // «... by Navn - Thingiverse» i tittelen
    (html.match(/\bby\s+([\p{L}\p{N}_\-.]{2,40})\s*[-–|]\s*(?:Thingiverse|Printables|MakerWorld)/iu) ?? [])[1],
  ];
  for (const k of kandidater) {
    const v = (k ?? '').trim();
    if (v && !/^https?:/i.test(v) && v.toLowerCase() !== nettsted) return avkod(v);
  }
  return '';
}

