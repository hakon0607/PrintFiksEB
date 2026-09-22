'use client';

import { useState } from 'react';
import { TableEditor } from '@/components/admin/TableEditor';
import { AiOgImport } from '@/components/admin/AiOgImport';

export default function GalleriAdmin() {
  const [nokkel, setNokkel] = useState(0);

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

      <AiOgImport onImportert={() => setNokkel((n) => n + 1)} />

      <TableEditor
        key={nokkel}
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
          tagline: '',
          highlights: [],
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
          {
            key: 'tagline',
            label: 'Undertittel',
            type: 'text',
            placeholder: 'Én kort setning som selger poenget',
            help: 'Vises rett under navnet på produktsiden.',
          },
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
            key: 'highlights',
            label: 'Kulepunkter',
            type: 'lines',
            help: 'Ett punkt per linje. Vises med haker på produktsiden.',
            placeholder: 'Passer på pulten\nFerdig montert fra printeren\nTåler daglig bruk',
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
