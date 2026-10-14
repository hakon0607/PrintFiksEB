'use client';

import { DekselModeller } from '@/components/admin/DekselModeller';
import { DekselProdukt } from '@/components/admin/DekselProdukt';
import { SettingsEditor } from '@/components/admin/SettingsEditor';
import { DekselStatus } from '@/components/admin/DekselStatus';

export default function DekslerSide() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Deksler</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          Dekselet er et vanlig produkt i galleriet – kunden trykker på det og lager sitt eget design. Her redigerer dere
          alt: produktet, prisene, filamentfargene og hvilke mobiler som finnes. Bestillinger finner dere under
          Bestillinger, med knappen «Last ned printfil».
        </p>
      </div>

      <DekselStatus />

      <section className="space-y-3">
        <h2 className="text-xl font-bold">1. Produktet</h2>
        <DekselProdukt />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">2. Priser og farger</h2>
        <SettingsEditor grupper={['Deksel']} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">3. Mobiler</h2>
        <DekselModeller />
      </section>
    </div>
  );
}
