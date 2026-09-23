import type { Metadata } from 'next';
import { getSiteData } from '@/lib/data';
import { num, text, bool } from '@/lib/settings';
import { OrderFlow } from '@/components/OrderFlow';
import { Reveal } from '@/components/Reveal';
import { Blobs } from '@/components/Blobs';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Bestill',
  description:
    'Se over handlelisten din, fyll inn adresse og levering, og send en ferdig melding til PrintFiksEB.',
};

export default async function BestillSide() {
  const site = await getSiteData();
  const s = site.settings;

  return (
    <div className="relative pb-24 pt-12 sm:pt-16">
      <Blobs variant="soft" />
      <div className="container-x">
        <Reveal>
          <span className="eyebrow">Bestilling</span>
          <h1 className="mt-4 max-w-2xl text-balance text-4xl font-bold sm:text-5xl">
            Nesten ferdig – vi lager meldingen for deg
          </h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-600">
            Fyll inn navn og hvordan du vil ha varene, så setter vi sammen en ferdig melding. Du
            trykker bare send.
          </p>
        </Reveal>

        <div className="mt-10">
          <OrderFlow
            deliveryOptions={site.deliveryOptions}
            startFee={num(s, 'pris_startpris', 100)}
            useStartFee={bool(s, 'pris_startpris_pa', true)}
            currency={text(s, 'pris_valuta', 'kr')}
            phone={text(s, 'kontakt_telefon', '41381608')}
            vippsNumber={text(s, 'vipps_nummer', text(s, 'kontakt_telefon', '41381608'))}
            businessName={text(s, 'bedrift_navn', 'PrintFiksEB')}
            paymentText={text(s, 'betaling_tekst', '')}
            approvalText={text(s, 'tekst_godkjenning', '')}
            radiusKm={num(s, 'levering_radius_km', 3)}
            daysMin={num(s, 'levering_dager_min', 2)}
            daysMax={num(s, 'levering_dager_maks', 4)}
          />
        </div>
      </div>
    </div>
  );
}
