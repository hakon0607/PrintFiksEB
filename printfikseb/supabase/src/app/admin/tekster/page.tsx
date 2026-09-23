'use client';

import { SettingsEditor } from '@/components/admin/SettingsEditor';

export default function TeksterSide() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tekster</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          Alt kundene leser på nettsiden kan endres her. Skriv som du snakker – det er lettest å
          forstå.
        </p>
      </div>

      <SettingsEditor
        grupper={['Tekster', 'Generelt']}
        beskrivelser={{
          Tekster: 'Overskrifter og avsnitt på forsiden og «Om oss».',
          Generelt: 'Navnet på bedriften, slagord og hvor dere holder til.',
        }}
      />
    </div>
  );
}
