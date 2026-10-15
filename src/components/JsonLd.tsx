import { ldTekst } from '@/lib/strukturert';

/** Strukturert data for søkemotorer og AI (usynlig for besøkende). */
export function JsonLd({ data }: { data: unknown }) {
  if (!data) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldTekst(data) }} />;
}
