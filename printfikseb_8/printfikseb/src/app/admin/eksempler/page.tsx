'use client';

import { TableEditor } from '@/components/admin/TableEditor';

export default function EksemplerSide() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hva vi kan fikse</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          Dette er eksemplene som vises på siden «Hva vi kan fikse». Legg inn ting folk ikke tenker
          på at en 3D-printer kan lage – gjerne med bilde av noe dere faktisk har laget.
        </p>
      </div>

      <TableEditor
        table="examples"
        tittel="Eksempler"
        beskrivelse="Trykk på et eksempel for å endre det. Pilene styrer rekkefølgen på siden."
        enhetsnavn="eksempel"
        tittelFelt="title"
        nyRad={{ title: 'Nytt eksempel', description: '', image_url: '', category: '', active: true }}
        felter={[
          { key: 'image_url', label: 'Bilde', type: 'image', help: 'Valgfritt, men gjør mye. Bilde av noe dere har laget.' },
          { key: 'title', label: 'Overskrift', type: 'text', placeholder: 'F.eks. Knekte klips og fester' },
          {
            key: 'category',
            label: 'Kategori',
            type: 'text',
            placeholder: 'F.eks. Reparasjon, Gaver, Oppbevaring',
          },
          {
            key: 'description',
            label: 'Forklaring',
            type: 'longtext',
            placeholder: 'To-tre setninger om hva dere kan lage og hvorfor det er nyttig.',
          },
        ]}
      />
    </div>
  );
}
