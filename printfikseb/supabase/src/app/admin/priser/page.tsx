'use client';

import { SettingsEditor } from '@/components/admin/SettingsEditor';
import { TableEditor } from '@/components/admin/TableEditor';

export default function PriserSide() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Priser</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          Her endrer du alt som har med pris å gjøre. Alt lagres automatisk, og priskalkulatoren på
          nettsiden oppdaterer seg med en gang.
        </p>
      </div>

      <SettingsEditor
        grupper={['Priser']}
        beskrivelser={{
          Priser:
            'Startprisen legges på én gang per bestilling. Skru den av hvis dere ikke vil bruke den.',
        }}
      />

      <TableEditor
        table="materials"
        tittel="Materialer"
        beskrivelse="Prisen per gram for hvert materiale. Vil dere begynne med et nytt materiale, trykk «Legg til materiale»."
        enhetsnavn="materiale"
        tittelFelt="name"
        nyRad={{ name: 'Nytt materiale', price_per_gram: 1, description: '', color: '#2559C7', active: true }}
        felter={[
          { key: 'name', label: 'Navn', type: 'text', placeholder: 'F.eks. TPU' },
          { key: 'price_per_gram', label: 'Pris per gram', type: 'price', suffix: 'kr/g' },
          {
            key: 'description',
            label: 'Kort forklaring til kunden',
            type: 'longtext',
            placeholder: 'Hva passer dette materialet til?',
          },
          { key: 'color', label: 'Farge på prikken', type: 'color', help: 'Vises ved siden av navnet på nettsiden.' },
        ]}
      />

      <TableEditor
        table="weight_ranges"
        tittel="Størrelser i kalkulatoren"
        beskrivelse="Disse valgene får kunden hvis de ikke vet nøyaktig vekt. Prisen regnes ut som et intervall mellom «fra» og «til»."
        enhetsnavn="størrelse"
        tittelFelt="label"
        nyRad={{ label: 'Ny størrelse', min_g: 0, max_g: 10, active: true }}
        felter={[
          {
            key: 'label',
            label: 'Tekst kunden ser',
            type: 'text',
            bred: true,
            placeholder: 'F.eks. 0–10 g (nøkkelring, liten figur)',
          },
          { key: 'min_g', label: 'Fra', type: 'number', suffix: 'gram' },
          { key: 'max_g', label: 'Til', type: 'number', suffix: 'gram' },
        ]}
      />

      <TableEditor
        table="extras"
        tittel="Tillegg"
        beskrivelse="Ekstra ting kunden kan huke av, som at dere designer filen eller kommer hjem og måler opp."
        enhetsnavn="tillegg"
        tittelFelt="name"
        nyRad={{ name: 'Nytt tillegg', description: '', price: 50, scope: 'item', active: true }}
        felter={[
          { key: 'name', label: 'Navn', type: 'text', bred: true },
          { key: 'price', label: 'Pris', type: 'price', suffix: 'kr' },
          {
            key: 'scope',
            label: 'Hvor mange ganger legges den på?',
            type: 'select',
            valg: [
              { verdi: 'item', tekst: 'For hver modell' },
              { verdi: 'order', tekst: 'Én gang per bestilling' },
            ],
          },
          { key: 'description', label: 'Forklaring til kunden', type: 'longtext' },
        ]}
      />

      <TableEditor
        table="delivery_options"
        tittel="Levering"
        beskrivelse="Valgene kunden får når de bestiller. Sett prisen til 0 for gratis."
        enhetsnavn="leveringsvalg"
        tittelFelt="name"
        nyRad={{ name: 'Nytt leveringsvalg', description: '', price: 0, active: true }}
        felter={[
          { key: 'name', label: 'Navn', type: 'text' },
          { key: 'price', label: 'Pris', type: 'price', suffix: 'kr' },
          { key: 'description', label: 'Forklaring til kunden', type: 'longtext' },
        ]}
      />
    </div>
  );
}
