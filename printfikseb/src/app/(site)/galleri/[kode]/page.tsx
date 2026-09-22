import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSiteFor } from '@/lib/data';
import { num, text } from '@/lib/settings';
import { ProductDetail } from '@/components/ProductDetail';
import { ProductCard } from '@/components/ProductCard';
import { Reveal, Stagger, StaggerItem } from '@/components/Reveal';
import { Blobs } from '@/components/Blobs';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { kode: string };
}): Promise<Metadata> {
  const site = await getSiteFor();
  const p = site.products.find((x) => x.code === params.kode);
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
  const product = site.products.find((p) => p.code === params.kode);
  if (!product) notFound();

  const valuta = text(site.settings, 'pris_valuta', 'kr');
  const andre = site.products.filter((p) => p.id !== product.id).slice(0, 3);

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

        <div className="mt-6">
          <ProductDetail
            product={product}
            currency={valuta}
            daysMin={num(site.settings, 'levering_dager_min', 2)}
            daysMax={num(site.settings, 'levering_dager_maks', 4)}
          />
        </div>

        {andre.length > 0 && (
          <section className="mt-20">
            <Reveal>
              <h2 className="text-balance text-2xl font-bold sm:text-3xl">Andre modeller</h2>
            </Reveal>
            <Stagger className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {andre.map((p) => (
                <StaggerItem key={p.id} className="h-full">
                  <ProductCard product={p} currency={valuta} />
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        )}
      </div>
    </div>
  );
}
