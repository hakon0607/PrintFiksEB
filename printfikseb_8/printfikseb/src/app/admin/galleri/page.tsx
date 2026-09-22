'use client';

import { useAdmin } from '@/components/admin/AdminProvider';
import { AiNokkel } from '@/components/admin/AiNokkel';
import { TableEditor, type Felt } from '@/components/admin/TableEditor';

export default function GalleriAdmin() {
  const { profile } = useAdmin();
  const erEier = profile?.role === 'eier';

  const felter: Felt[] = [
    { key: 'image_url', label: 'Bilder', type: 'bildesett' },
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
      help: 'Brukes som filter i galleriet. Kan stå tomt.',
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
      placeholder: 'Fortell mer: hva passer den til, hvordan brukes den, hva bør kunden vite?',
    },
    {
      key: 'highlights',
      label: 'Kulepunkter',
      type: 'lines',
      help: 'Ett punkt per linje. Vises med haker på produktsiden.',
      placeholder: 'Passer på pulten\nFerdig montert fra printeren\nTåler daglig bruk',
    },
    {
      key: 'featured',
      label: 'Vis på forsiden',
      type: 'bool',
      help: 'Merkes som «Populær» og vises øverst på forsiden.',
    },
  ];

  // Lenken til originalmodellen er bare til internt bruk
  if (erEier) {
    felter.push({
      key: 'source_url',
      label: 'Lenke til originalen (kun for eiere)',
      type: 'text',
      placeholder: 'https://makerworld.com/...',
      help: 'Bare dere som er eiere ser dette feltet. Lenken vises aldri på nettsiden.',
      bred: true,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Galleri</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          Her legger dere inn ferdige modeller folk kan kjøpe. Last opp bilder, skriv det dere vet,
          og trykk <span className="font-semibold text-ink-800">«Finpuss med AI»</span> – så rydder
          den teksten, fyller ut resten og foreslår en pen pris. Liker dere det ikke, er det bare å
          trykke angre.
        </p>
      </div>

      <AiNokkel />

      <TableEditor
        table="products"
        tittel="Modeller i galleriet"
        beskrivelse="Trykk på en modell for å endre den. Bryteren til høyre skjuler modellen fra nettsiden uten å slette den."
        enhetsnavn="modell"
        tittelFelt="name"
        finpuss
        tomTekst="Ingen modeller ennå. Trykk «Legg til modell», last opp bilder og skriv litt – så finpusser AI-en resten."
        nyRad={{
          name: 'Ny modell',
          description: '',
          details: '',
          tagline: '',
          highlights: [],
          price: 99,
          image_url: '',
          images: [],
          material: 'PLA',
          category: '',
          featured: false,
          active: true,
        }}
        felter={felter}
      />
    </div>
  );
}
