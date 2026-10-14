import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSiteFor } from '@/lib/data';
import { num, text } from '@/lib/settings';
import { DekselGenerator } from '@/components/DekselGenerator';
import { DEKSEL_KODE } from '@/lib/deksel/produkt';
import { hentDekselModeller, hentDekselProdukt } from '@/lib/deksel/server';
import { dekselFargerFra, lesFilamenter } from '@/lib/deksel/farger';
import { oppsettFra, PEPPERKAKE_KODE } from '@/lib/pepperkake/pris';
import { PepperkakeStudio } from '@/components/pepperkake/PepperkakeStudio';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { kode: string } }): Promise<Metadata> {
  if (params.kode === PEPPERKAKE_KODE) {
    return {
      title: 'Tegn din pepperkakeform',
      description: 'Tegn formen selv, se den i 3D og bestill – vi printer pepperkakeformen din.',
    };
  }
  return {
    title: 'Design ditt deksel',
    description: 'Last opp bilde, skriv tekst eller tegn selv – og se mobildekselet ditt i 3D før du bestiller.',
  };
}

/** Dekselstudioet – egen side, så produktsiden kan se ut som alle de andre. */
export default async function LagDeksel({
  params,
  searchParams,
}: {
  params: { kode: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  if (params.kode === PEPPERKAKE_KODE) return <LagPepperkake searchParams={searchParams} />;
  if (params.kode !== DEKSEL_KODE) notFound();
  const site = await getSiteFor(searchParams);
  const product =
    site.products.find((p) => p.code === DEKSEL_KODE) ?? (await hentDekselProdukt(site.settings)) ?? null;
  if (!product) notFound();
  const filamenter = lesFilamenter(text(site.settings, 'deksel_farger', ''));

  return (
    <div className="relative pb-24 pt-8 sm:pt-10">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link
              href={`/galleri/${DEKSEL_KODE}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition-colors hover:text-brand-700"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M19 12H5m0 0 5.5-5.5M5 12l5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Tilbake til {product.name.toLowerCase()}
            </Link>
            <h1 className="mt-3 text-balance text-3xl font-bold sm:text-4xl">Design ditt deksel</h1>
          </div>
        </div>
        <div className="mt-6">
          <DekselGenerator
            produktNavn={product.name}
            modeller={await hentDekselModeller()}
            filamenter={filamenter}
            dekselFarger={dekselFargerFra(text(site.settings, 'deksel_dekselfarger', 'Hvit'), filamenter)}
            grunnpris={num(site.settings, 'deksel_grunnpris', 59)}
            perFarge={num(site.settings, 'deksel_pris_per_farge', 10)}
            maksFarger={Math.max(1, Math.min(6, num(site.settings, 'deksel_maks_farger', 3)))}
          />
        </div>
      </div>
    </div>
  );
}

/** Tegnestudioet for pepperkakeformer. */
async function LagPepperkake({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const site = await getSiteFor(searchParams);
  const product = site.products.find((p) => p.code === PEPPERKAKE_KODE);
  if (!product) notFound();

  return (
    <div className="relative pb-24 pt-8 sm:pt-10">
      <div className="container-x">
        <div>
          <Link
            href={`/galleri/${PEPPERKAKE_KODE}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition-colors hover:text-brand-700"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M19 12H5m0 0 5.5-5.5M5 12l5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Tilbake til {product.name.toLowerCase()}
          </Link>
          <h1 className="mt-3 text-balance text-3xl font-bold sm:text-4xl">Tegn din pepperkakeform</h1>
        </div>
        <div className="mt-6">
          <PepperkakeStudio produktNavn={product.name} oppsett={oppsettFra(site.settings)} />
        </div>
      </div>
    </div>
  );
}
