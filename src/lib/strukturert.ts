/**
 * Strukturert data (schema.org / JSON-LD) – det Google, Bing, ChatGPT, Gemini
 * og andre søkemotorer og AI-er leser for å forstå hvem vi er, hva vi selger
 * og hva det koster. Alt hentes fra innholdet i admin.
 */
import type { Faq, Product } from './types';
import { text } from './settings';

type Innst = Record<string, string>;

const url = (base: string, sti: string) => `${base.replace(/\/$/, '')}${sti}`;
const abs = (base: string, src?: string | null) => (!src ? undefined : /^https?:\/\//.test(src) ? src : url(base, src.startsWith('/') ? src : `/${src}`));

/** Lenker til sosiale medier som står i admin (Facebook, Instagram …). */
export function sosialeLenker(s: Innst): string[] {
  return ['sosial_facebook', 'sosial_instagram', 'sosial_tiktok', 'sosial_youtube']
    .map((k) => text(s, k).trim())
    .filter((v) => /^https?:\/\//.test(v));
}

export function telefonIntl(tlf: string) {
  const d = tlf.replace(/\D/g, '');
  return d.length === 8 ? `+47${d}` : d ? `+${d}` : undefined;
}

/** Bedriften – vises på alle sider. */
export function bedriftLd(s: Innst, base: string) {
  const navn = text(s, 'bedrift_navn', 'PrintFiksEB');
  const sted = text(s, 'bedrift_sted', 'Sandsli, Bergen');
  const [bydel, by] = sted.includes(',') ? sted.split(',').map((x) => x.trim()) : ['', sted];
  const epost = text(s, 'kontakt_epost');
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': url(base, '/#bedrift'),
    name: navn,
    alternateName: ['PrintFiks', 'PrintFiks EB'],
    slogan: text(s, 'bedrift_slagord') || undefined,
    description:
      text(s, 'tekst_om_oss') ||
      `${navn} er en elevbedrift som 3D-printer, reparerer og designer ting i plast.`,
    url: url(base, '/'),
    logo: url(base, '/icon-512.png'),
    image: url(base, '/icon-512.png'),
    telephone: telefonIntl(text(s, 'kontakt_telefon', '41381608')),
    email: epost || undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: by || 'Bergen',
      ...(bydel ? { streetAddress: bydel } : {}),
      addressCountry: 'NO',
    },
    areaServed: { '@type': 'City', name: by || 'Bergen' },
    parentOrganization: text(s, 'bedrift_skole') ? { '@type': 'School', name: text(s, 'bedrift_skole') } : undefined,
    knowsAbout: ['3D-printing', '3D-print', 'reparasjon av plastdeler', 'mobildeksel med eget motiv', 'pepperkakeformer', 'PLA', 'PETG'],
    paymentAccepted: 'Vipps, kontant',
    currenciesAccepted: 'NOK',
    priceRange: 'kr',
    sameAs: sosialeLenker(s).length ? sosialeLenker(s) : undefined,
  };
}

/** Nettstedet – gjør at søkemotorene kobler sidene til bedriften. */
export function nettstedLd(s: Innst, base: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': url(base, '/#nettsted'),
    name: text(s, 'bedrift_navn', 'PrintFiksEB'),
    url: url(base, '/'),
    inLanguage: 'nb-NO',
    publisher: { '@id': url(base, '/#bedrift') },
  };
}

/** Én modell i galleriet. */
export function produktLd(p: Product, base: string, s: Innst) {
  const bilder = [p.image_url, ...(p.images ?? [])].map((b) => abs(base, b)).filter(Boolean);
  const side = url(base, `/galleri/${p.code ?? ''}`);
  const fra = p.spesial === 'deksel' || p.spesial === 'pepperkake';
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: [p.tagline, p.description, p.details].filter(Boolean).join(' ').slice(0, 1500) || p.name,
    sku: p.code ?? undefined,
    image: bilder.length ? bilder : undefined,
    category: p.category || undefined,
    material: p.material || undefined,
    url: side,
    brand: { '@type': 'Brand', name: text(s, 'bedrift_navn', 'PrintFiksEB') },
    offers: {
      '@type': 'Offer',
      url: side,
      priceCurrency: 'NOK',
      price: Number(p.price) || 0,
      ...(fra ? { priceSpecification: { '@type': 'PriceSpecification', minPrice: Number(p.price) || 0, priceCurrency: 'NOK' } } : {}),
      availability: 'https://schema.org/InStock',
      seller: { '@id': url(base, '/#bedrift') },
    },
  };
}

/** Spørsmål og svar. */
export function faqLd(faq: Faq[]) {
  const liste = faq.filter((f) => f.question && f.answer);
  if (!liste.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: liste.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

/** Gjør om til trygg tekst for en <script>-blokk. */
export function ldTekst(data: unknown) {
  return JSON.stringify(data, (_k, v) => (v === undefined ? undefined : v)).replace(/</g, '\\u003c');
}
