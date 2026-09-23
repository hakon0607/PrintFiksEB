import type { Metadata } from 'next';
import Link from 'next/link';
import { getSiteData } from '@/lib/data';
import { text } from '@/lib/settings';
import { GalleryGrid } from '@/components/GalleryGrid';
import { Reveal } from '@/components/Reveal';
import { Blobs } from '@/components/Blobs';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Galleri',
  description:
    'Ferdige 3D-printede modeller du kan kjøpe direkte fra PrintFiksEB. Legg dem i handlelisten og send oss en melding.',
};

export default async function GalleriSide() {
  const site = await getSiteData();
  const valuta = text(site.settings, 'pris_valuta', 'kr');

  return (
    <div className="relative pb-24 pt-12 sm:pt-16">
      <Blobs variant="soft" />
      <div className="container-x">
        <Reveal>
          <span className="eyebrow">Galleri</span>
          <h1 className="mt-4 max-w-2xl text-balance text-4xl font-bold sm:text-5xl">
            Ferdige modeller, klare til å bestilles
          </h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-600">
            Dette er modeller vi allerede har laget og kan printe til deg. Hver modell har sin egen
            ID – den tar du med i meldingen, så vet vi nøyaktig hva du vil ha.
          </p>
        </Reveal>

        <div className="mt-10">
          <GalleryGrid products={site.products} currency={valuta} />
        </div>

        <Reveal>
          <div className="mt-14 flex flex-col items-start gap-4 rounded-3xl border border-brand-200 bg-brand-50/70 p-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Fant du ikke det du lette etter?</h2>
              <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-ink-600">
                Vi lager også helt egne modeller. Beskriv hva du trenger i priskalkulatoren, så gir vi
                deg et tilbud.
              </p>
            </div>
            <Link href="/kalkulator" className="btn-primary shrink-0">
              Bestill noe eget
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
