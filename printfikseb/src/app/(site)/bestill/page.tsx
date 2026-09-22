import type { Metadata } from 'next';
import { getSiteFor } from '@/lib/data';
import { num, text, bool } from '@/lib/settings';
import { OrderFlow } from '@/components/OrderFlow';
import { Reveal } from '@/components/Reveal';
import { Blobs } from '@/components/Blobs';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Bestill',
  description:
    'Sett sammen bestillingen din hos PrintFiksEB, og send en ferdig melding – eller ring oss. Du får alltid pris før vi starter.',
};

export default async function BestillSide({
  searchParams,
}: {
  searchParams?: { m?: string; w?: string; forhandsvis?: string };
}) {
  const site = await getSiteFor(searchParams);
  const s = site.settings;

  return (
    <div className="relative pb-24 pt-12 sm:pt-16">
      <Blobs variant="soft" />
      <div className="container-x">
        <Reveal>
          <span className="eyebrow">Bestilling</span>
          <h1 className="mt-4 max-w-2xl text-balance text-4xl font-bold sm:text-5xl">
            Fortell oss hva du vil ha
          </h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-600">
            Legg til det vi skal lage, velg hvordan du vil ha det levert, og send oss en ferdig
            melding. Foretrekker du å snakke med noen? Ring oss – begge deler går like fint.
          </p>
        </Reveal>

        <div className="mt-10">
          <OrderFlow
            deliveryOptions={site.deliveryOptions}
            materials={site.materials}
            weightRanges={site.weightRanges}
            extras={site.extras}
            repairPriceText={text(s, 'pris_reparasjon', 'Pris etter avtale')}
            repairText={text(s, 'tekst_reparasjon', '')}
            forhandsvalgtMaterial={searchParams?.m}
            forhandsvalgtStorrelse={searchParams?.w}
            startFee={num(s, 'pris_startpris', 100)}
            useStartFee={bool(s, 'pris_startpris_pa', true)}
            currency={text(s, 'pris_valuta', 'kr')}
            phone={text(s, 'kontakt_telefon', '41381608')}
            vippsNumber={text(s, 'vipps_nummer', text(s, 'kontakt_telefon', '41381608'))}
            businessName={text(s, 'bedrift_navn', 'PrintFiksEB')}
            paymentText={text(s, 'betaling_tekst', '')}
            approvalText={text(s, 'tekst_godkjenning', '')}
            phoneHours={text(s, 'kontakt_ringetid', '')}
            messageHours={text(s, 'kontakt_meldingstid', '')}
            callbackText={text(s, 'kontakt_ringer_tilbake', '')}
            radiusKm={num(s, 'levering_radius_km', 3)}
            daysMin={num(s, 'levering_dager_min', 2)}
            daysMax={num(s, 'levering_dager_maks', 4)}
          />
        </div>
      </div>
    </div>
  );
}
