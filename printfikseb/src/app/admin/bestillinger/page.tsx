'use client';

import { Bestillinger } from '@/components/admin/Bestillinger';

export default function BestillingerSide() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bestillinger</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          Her fører dere opp bestillingene som kommer inn på melding eller telefon. Da ser alle hva
          som er på gang, hvem som gjør hva, og hva som er betalt. Siden er bare intern – kundene
          ser den aldri.
        </p>
      </div>

      <Bestillinger />
    </div>
  );
}
