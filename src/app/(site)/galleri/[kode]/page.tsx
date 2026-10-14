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
import { DekselGenerator } from '@/components/DekselGenerator';
import { DEKSEL_KODE, erDekselProdukt } from '@/lib/deksel/produkt';
import { hentDekselModeller, hentDekselProdukt } from '@/lib/deksel/server';
import { lesFilamenter } from '@/lib/deksel/farger';

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
            <h1 className="text-balance text-3xl font-bold sm:text-4xl">{product.name}</h1>
            {product.tagline && (
              <p className="mt-2 text-balance text-lg leading-snug text-ink-500">{product.tagline}</p>
            )}
            {product.description && (
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-700">{product.description}</p>
            )}
            <div className="mt-8">
              <DekselGenerator
                produktNavn={product.name}
                modeller={await hentDekselModeller()}
                filamenter={lesFilamenter(text(site.settings, 'deksel_farger', ''))}
                grunnpris={num(site.settings, 'deksel_grunnpris', 59)}
                perFarge={num(site.settings, 'deksel_pris_per_farge', 10)}
                maksFarger={Math.max(1, Math.min(6, num(site.settings, 'deksel_maks_farger', 3)))}
              />
            </div>
            {(product.details || (product.highlights?.length ?? 0) > 0) && (
              <div className="mt-12 grid gap-8 rounded-3xl border border-ink-100 bg-white/70 p-6 sm:p-8 lg:grid-cols-2">
                {product.details && (
                  <div className="space-y-3 text-[15px] leading-relaxed text-ink-600">
                    {product.details
                      .split(/\n{2,}/)
                      .filter((a) => a.trim())
                      .map((avsnitt, i) => (
                        <p key={i}>{avsnitt.trim()}</p>
                      ))}
                  </div>
                )}
                {(product.highlights?.length ?? 0) > 0 && (
                  <ul className="space-y-2.5">
                    {product.highlights!.map((h, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[15px] text-ink-700">
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
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
