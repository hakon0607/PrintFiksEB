import type { Metadata } from 'next';
import { getSiteData } from '@/lib/data';
import { num, text, bool } from '@/lib/settings';
import { Calculator } from '@/components/Calculator';
import { Reveal } from '@/components/Reveal';
import { Blobs } from '@/components/Blobs';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Priskalkulator',
  description:
    'Regn ut hva 3D-printen din koster. Velg materiale og størrelse, legg til design om du trenger det, og få et estimat med en gang.',
};

export default async function KalkulatorSide() {
  const site = await getSiteData();
  const s = site.settings;

  return (
    <div className="relative pb-24 pt-12 sm:pt-16">
      <Blobs variant="soft" />
      <div className="container-x">
        <Reveal>
          <span className="eyebrow">Priskalkulator</span>
          <h1 className="mt-4 max-w-2xl text-balance text-4xl font-bold sm:text-5xl">
            Finn ut hva det koster på under ett minutt
          </h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-600">
            Du trenger ikke vite noe teknisk. Velg materiale, si omtrent hvor stor modellen er, og se
            prisen med én gang. {text(s, 'tekst_godkjenning', '')}
          </p>
        </Reveal>

        <div className="mt-10">
          <Calculator
            materials={site.materials}
            weightRanges={site.weightRanges}
            extras={site.extras}
            startFee={num(s, 'pris_startpris', 100)}
            useStartFee={bool(s, 'pris_startpris_pa', true)}
            currency={text(s, 'pris_valuta', 'kr')}
            repairPriceText={text(s, 'pris_reparasjon', 'Pris etter avtale')}
            repairText={text(s, 'tekst_reparasjon', '')}
          />
        </div>
      </div>
    </div>
  );
}
