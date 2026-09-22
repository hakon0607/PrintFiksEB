import type { Metadata } from 'next';
import Link from 'next/link';
import { getSiteFor } from '@/lib/data';
import { num, text, bool, formatPhone, telHref } from '@/lib/settings';
import { SimpleCalculator } from '@/components/SimpleCalculator';
import { Reveal } from '@/components/Reveal';
import { Blobs } from '@/components/Blobs';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Priskalkulator',
  description:
    'Se hva en 3D-print koster hos PrintFiksEB på et par sekunder. Velg materiale og størrelse, så får du et prisestimat med en gang.',
};

export default async function KalkulatorSide({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const site = await getSiteFor(searchParams);
  const s = site.settings;
  const telefon = text(s, 'kontakt_telefon', '41381608');
  const designPris = site.extras.find((e) => e.scope === 'item')?.price ?? 100;
  const leveringPris = site.deliveryOptions.find((d) => Number(d.price) > 0)?.price ?? 50;

  return (
    <div className="relative pb-24 pt-12 sm:pt-16">
      <Blobs variant="soft" />
      <div className="container-x">
        <Reveal>
          <span className="eyebrow">Priskalkulator</span>
          <h1 className="mt-4 max-w-2xl text-balance text-4xl font-bold sm:text-5xl">
            Hva koster det? Finn ut på to klikk
          </h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-600">
            Dette er bare en rask prissjekk – du bestiller ingenting her. Velg materiale og omtrent
            hvor stor modellen er, så ser du hva det havner på.
          </p>
        </Reveal>

        <div className="mt-10">
          <SimpleCalculator
            materials={site.materials}
            weightRanges={site.weightRanges}
            startFee={num(s, 'pris_startpris', 100)}
            useStartFee={bool(s, 'pris_startpris_pa', true)}
            currency={text(s, 'pris_valuta', 'kr')}
            phone={telefon}
            designPrice={Number(designPris)}
            deliveryPrice={Number(leveringPris)}
            radiusKm={num(s, 'levering_radius_km', 3)}
            phoneHours={text(s, 'kontakt_ringetid', '')}
          />
        </div>

        <Reveal>
          <div className="mt-14 flex flex-col items-start gap-5 rounded-3xl border border-brand-200 bg-brand-50/70 p-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Klar til å bestille?</h2>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-600">
                På bestillingssiden beskriver du hva du vil ha, velger antall og tillegg, og sender
                oss en ferdig melding. Vil du heller snakke med noen, er det bare å ringe.
              </p>
            </div>
            <div className="shrink-0">
              <div className="flex flex-wrap gap-2">
                <Link href="/bestill" className="btn-primary">
                  Gå til bestilling
                </Link>
                <a href={telHref(telefon)} className="btn-ghost">
                  Ring {formatPhone(telefon)}
                </a>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-500">
                Melding: hele døgnet · {text(s, 'kontakt_ringetid', '')}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
