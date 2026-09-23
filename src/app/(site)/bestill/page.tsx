import type { Metadata } from 'next';
import { getSiteFor } from '@/lib/data';
import { num, text, bool } from '@/lib/settings';
import { Bestilling } from '@/components/Bestilling';
import { Reveal } from '@/components/Reveal';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Bestill',
  description:
    'Sett sammen bestillingen din hos PrintFiksEB og se prisen mens du velger. Send den rett inn til oss, så tar vi kontakt med endelig pris før vi starter.',
};

export default async function BestillSide({
  searchParams,
}: {
  searchParams?: { m?: string; w?: string; q?: string; forhandsvis?: string };
}) {
  const site = await getSiteFor(searchParams);
  const s = site.settings;

  return (
    <div className="pb-20 pt-8 sm:pt-12">
      <div className="container-x">
        <Reveal>
          <h1 className="text-balance text-3xl font-bold sm:text-4xl">Bestill</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
            Velg hva du vil ha, så ser du prisen med en gang. Ingenting er bindende – vi tar
            kontakt og gir deg en endelig pris som du må godkjenne før vi starter.
          </p>
        </Reveal>

        <div className="mt-8">
          <Bestilling
            materials={site.materials}
            weightRanges={site.weightRanges}
            extras={site.extras}
            colors={site.colors}
            deliveryOptions={site.deliveryOptions}
            startFee={num(s, 'pris_startpris', 100)}
            useStartFee={bool(s, 'pris_startpris_pa', true)}
            currency={text(s, 'pris_valuta', 'kr')}
            phone={text(s, 'kontakt_telefon', '41381608')}
            vippsNumber={text(s, 'vipps_nummer', text(s, 'kontakt_telefon', '41381608'))}
            businessName={text(s, 'bedrift_navn', 'PrintFiksEB')}
            paymentText={text(s, 'betaling_tekst', '')}
            approvalText={text(s, 'tekst_godkjenning', '')}
            repairPriceText={text(s, 'pris_reparasjon', 'Pris etter avtale')}
            repairText={text(s, 'tekst_reparasjon', '')}
            phoneHours={text(s, 'kontakt_ringetid', '')}
            messageHours={text(s, 'kontakt_meldingstid', '')}
            callbackText={text(s, 'kontakt_ringer_tilbake', '')}
            radiusKm={num(s, 'levering_radius_km', 3)}
            daysMin={num(s, 'levering_dager_min', 2)}
            daysMax={num(s, 'levering_dager_maks', 4)}
            forhandsvalgtMaterial={searchParams?.m}
            forhandsvalgtStorrelse={searchParams?.w}
            forhandsvalgtTekst={searchParams?.q}
          />
        </div>
      </div>
    </div>
  );
}
