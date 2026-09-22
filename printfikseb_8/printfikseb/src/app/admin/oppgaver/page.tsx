'use client';

import { Oppgaver } from '@/components/admin/Oppgaver';

export default function OppgaverSide() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Oppgaver</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          Her planlegger dere hva som skal gjøres. Skriv inn en oppgave, velg hvem som tar den, og
          huk den av når den er ferdig. Denne siden ser bare dere – den vises aldri på nettsiden.
        </p>
      </div>

      <Oppgaver />
    </div>
  );
}
