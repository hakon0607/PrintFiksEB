'use client';

import { SettingsEditor } from '@/components/admin/SettingsEditor';

export default function InnstillingerSide() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Kontakt og levering</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          Telefonnummeret og e-postadressene her brukes over hele nettsiden og i kvitteringene.
          Endrer dere noe her, endres det alle steder.
        </p>
      </div>

      <SettingsEditor
        grupper={['Kontakt', 'Levering']}
        beskrivelser={{
          Kontakt: 'Telefon, e-post, Vipps og sosiale medier.',
          Levering: 'Hvor langt dere kjører, hvor lang tid dere bruker og hvordan folk betaler.',
        }}
      />
    </div>
  );
}
