'use client';

import { SettingsEditor } from '@/components/admin/SettingsEditor';

export default function InnstillingerSide() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Kontakt og levering</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          Telefonnummeret her er det bestillingene sendes til. Endrer dere det, endres SMS-knappen på
          hele nettsiden.
        </p>
      </div>

      <SettingsEditor
        grupper={['Kontakt', 'Levering']}
        beskrivelser={{
          Kontakt: 'Nummeret bestillingene kommer til, Vipps og sosiale medier.',
          Levering: 'Hvor langt dere kjører, hvor lang tid dere bruker og hvordan folk betaler.',
        }}
      />
    </div>
  );
}
