import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSiteFor } from '@/lib/data';
import { num, text } from '@/lib/settings';
import { ProductDetail } from '@/components/ProductDetail';
import { ProductCard } from '@/components/ProductCard';
import { Reveal, Stagger, StaggerItem } from '@/components/Reveal';
import { Blobs } from '@/components/Blobs';
import { temaFor } from '@/lib/temaer';
import { DEKSEL_KODE, erDekselProdukt } from '@/lib/deksel/produkt';
import { hentDekselProdukt } from '@/lib/deksel/server';
import { erPepperkakeProdukt, PEPPERKAKE_KODE, STANDARD_PRIS } from '@/lib/pepperkake/pris';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { kode: string };
}): Promise<Metadata> {
  const site = await getSiteFor();
  const p =
    site.products.find((x) => x.code === params.kode) ??
    (params.kode === DEKSEL_KODE ? await hentDekselProdukt(site.settings) : null);
  if (!p) return { title: 'Fant ikke modellen' };
  return {
    title: p.name,
    description: p.description || `${p.name} – 3D-printet av PrintFiksEB.`,
    openGraph: {
      title: p.name,
      description: p.description || '',
      images: p.image_url ? [p.image_url] : undefined,
    },
  };
}

export default async function ModellSide({
  params,
  searchParams,
}: {
  params: { kode: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const site = await getSiteFor(searchParams);
  let product = site.products.find((p) => p.code === params.kode);
  // dekselet virker selv om det ikke er publisert ennå
  if (!product && params.kode === DEKSEL_KODE) product = (await hentDekselProdukt(site.settings)) ?? undefined;
  if (!product) notFound();

  const valuta = text(site.settings, 'pris_valuta', 'kr');
  // «Andre modeller»: helst fra samme kategori, så resten
  const samme = site.products.filter(
    (p) => p.id !== product.id && (p.category ?? '').trim() && p.category === product.category
  );
  const andre = [...samme, ...site.products.filter((p) => p.id !== product.id && !samme.includes(p))].slice(0, 3);

  return (
    <div className="relative pb-24 pt-8 sm:pt-12">
      <Blobs variant="soft" />
      <div className="container-x">
        <Link
          href="/galleri"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition-colors hover:text-brand-700"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M19 12H5m0 0 5.5-5.5M5 12l5.5 5.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Tilbake til galleriet
        </Link>

        {erDekselProdukt(product) ? (
          <div className="mt-6">
            <ProductDetail
              product={product}
              currency={valuta}
              daysMin={num(site.settings, 'levering_dager_min', 2)}
              daysMax={num(site.settings, 'levering_dager_maks', 4)}
              design={{
                href: `/galleri/${DEKSEL_KODE}/lag`,
                knapp: 'Design ditt deksel',
                prisNotis: `${num(site.settings, 'deksel_grunnpris', 59)} kr + ${num(site.settings, 'deksel_pris_per_farge', 10)} kr per farge i motivet. Du ser prisen før du bestiller.`,
                info: 'Last opp bilde, skriv tekst, legg til symboler eller tegn selv – og se dekselet i 3D før du bestiller.',
                demo: 'Dekselstudioet er fortsatt i demo. Passer ikke dekselet, eller er det andre problemer, får du 100 % av pengene tilbake.',
              }}
            />
          </div>
        ) : erPepperkakeProdukt(product) ? (
          <div className="mt-6">
            <ProductDetail
              product={product}
              currency={valuta}
              daysMin={num(site.settings, 'levering_dager_min', 2)}
              daysMax={num(site.settings, 'levering_dager_maks', 4)}
              design={{
                href: `/galleri/${PEPPERKAKE_KODE}/lag`,
                knapp: 'Tegn din pepperkakeform',
                prisNotis: `Prisen regnes etter størrelsen: 7 × 7 cm koster ${product.pris_standard ?? STANDARD_PRIS} ${valuta}, opptil 20 × 20 cm. Du ser prisen mens du tegner.`,
                info: 'Tegn formen med fingeren eller musa, se den i 3D og legg den i bestillingen. Printes i hvit, 15 mm høy, med bred kant på toppen så du kan trykke hardt.',
              }}
            />
          </div>
        ) : (
          <div className="mt-6">
            <ProductDetail
              product={product}
              currency={valuta}
              daysMin={num(site.settings, 'levering_dager_min', 2)}
              daysMax={num(site.settings, 'levering_dager_maks', 4)}
            />
          </div>
        )}

        {/* Kreditering – CC BY-lisenser krever at designeren nevnes */}
        {product.source_url && (
          <p className="mt-8 rounded-2xl border border-ink-100 bg-white/70 px-5 py-4 text-[13px] leading-relaxed text-ink-500">
            Modellen er tegnet av{' '}
            <span className="font-semibold text-ink-700">
              {product.kilde_designer || 'en designer på nett'}
            </span>{' '}
            og delt under{' '}
            <span className="font-semibold text-ink-700">
              {product.kilde_lisens || 'en åpen lisens'}
            </span>
            . Vi printer den.{' '}
            <a
              href={product.source_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="font-semibold text-brand-700 underline underline-offset-4"
            >
              Se originalen
            </a>
            .
          </p>
        )}

        {andre.length > 0 && (
          <section className="mt-20">
            <Reveal>
              <h2 className="text-balance text-2xl font-bold sm:text-3xl">Andre modeller</h2>
            </Reveal>
            <Stagger className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {andre.map((p) => (
                <StaggerItem key={p.id} className="h-full">
                  <ProductCard product={p} currency={valuta} temaId={temaFor(p.category)?.id ?? null} />
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        )}
      </div>
    </div>
  );
}
