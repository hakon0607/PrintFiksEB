'use client';

import { TableEditor } from '@/components/admin/TableEditor';
import { Innlogginger } from '@/components/admin/Ansatte';

export default function AnsatteSide() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ansatte</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          Her bestemmer dere hvem som vises på «Om oss»-siden, og hvem som får logge inn og endre
          nettsiden.
        </p>
      </div>

      <TableEditor
        table="team_members"
        tittel="Vises på «Om oss»"
        beskrivelse="Legg inn navn, hva de gjør i bedriften og gjerne et bilde. Bryteren til høyre skjuler dem fra nettsiden."
        enhetsnavn="person"
        tittelFelt="name"
        tomTekst="Ingen lagt inn ennå. Trykk «Legg til person» og skriv inn navnet."
        harAktiv={false}
        nyRad={{ name: 'Nytt navn', role: '', bio: '', avatar_url: '', show_on_site: true }}
        felter={[
          { key: 'avatar_url', label: 'Bilde', type: 'image', help: 'Valgfritt. Uten bilde vises initialene.' },
          { key: 'name', label: 'Navn', type: 'text' },
          {
            key: 'role',
            label: 'Rolle',
            type: 'text',
            placeholder: 'F.eks. Daglig leder eller Produksjon',
          },
          {
            key: 'bio',
            label: 'Kort om personen',
            type: 'longtext',
            placeholder: 'En eller to setninger om hva de gjør.',
          },
          {
            key: 'show_on_site',
            label: 'Vis på nettsiden',
            type: 'bool',
          },
        ]}
      />

      <Innlogginger />
    </div>
  );
}
