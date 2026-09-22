'use client';

import { TableEditor } from '@/components/admin/TableEditor';

export default function GalleriAdmin() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Galleri</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          Her legger dere inn ferdige modeller folk kan kjøpe. Ta et bilde av modellen, skriv navn og
          pris – så er den på nettsiden. ID-nummeret lages automatisk, og det er det kunden oppgir
          når de bestiller.
        </p>
      </div>

      <TableEditor
        table="products"
        tittel="Modeller i galleriet"
        beskrivelse="Trykk på en modell for å endre den. Bryteren til høyre skjuler modellen fra nettsiden uten å slette den."
        enhetsnavn="modell"
        tittelFelt="name"
        tomTekst="Ingen modeller ennå. Trykk «Legg til modell», last opp et bilde og sett en pris."
        nyRad={{
          name: 'Ny modell',
          description: '',
          details: '',
          price: 100,
          image_url: '',
          images: [],
          material: 'PLA',
          category: '',
          featured: false,
          active: true,
        }}
        felter={[
          { key: 'image_url', label: 'Hovedbilde', type: 'image', help: 'Dette bildet vises på kortet i galleriet.' },
          { key: 'images', label: 'Flere bilder', type: 'images' },
          { key: 'name', label: 'Navn', type: 'text', placeholder: 'F.eks. Saksholder' },
          { key: 'price', label: 'Pris', type: 'price', suffix: 'kr' },
          {
            key: 'code',
            label: 'ID-nummer',
            type: 'text',
            help: 'Lages automatisk. Dette er nummeret kunden skriver i meldingen.',
          },
          {
            key: 'category',
            label: 'Kategori',
            type: 'text',
            placeholder: 'F.eks. Kontor, Kjøkken, Gaver',
            help: 'Brukes som filter på galleri-siden. Kan stå tomt.',
          },
          { key: 'material', label: 'Materiale', type: 'text', placeholder: 'PLA eller PETG' },
          { key: 'weight_g', label: 'Vekt', type: 'number', suffix: 'gram' },
          {
            key: 'description',
            label: 'Kort beskrivelse',
            type: 'longtext',
            placeholder: 'Én til to setninger. Vises på kortet i galleriet.',
          },
          {
            key: 'details',
            label: 'Full beskrivelse',
            type: 'longtext',
            help: 'Vises når kunden klikker seg inn på modellen. Tom linje mellom avsnitt.',
            placeholder: 'Fortell mer: hva passer den til, hvordan er den laget, hva bør kunden vite?',
          },
          {
            key: 'source_url',
            label: 'Lenke til originalen',
            type: 'text',
            help: 'Valgfritt. Fylles ut automatisk hvis modellen hentes fra MakerWorld.',
          },
          {
            key: 'featured',
            label: 'Vis på forsiden',
            type: 'bool',
            help: 'Merkes som «Populær» og vises øverst på forsiden.',
          },
        ]}
      />
    </div>
  );
}
