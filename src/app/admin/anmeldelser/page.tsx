'use client';

import { TableEditor } from '@/components/admin/TableEditor';

export default function AnmeldelserSide() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Anmeldelser</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          Det kundene sier om dere. Legg bare inn ekte tilbakemeldinger dere faktisk har fått, og
          spør kunden om lov før dere bruker navnet. Er det flere enn én, bytter de på forsiden.
        </p>
      </div>

      <TableEditor
        table="reviews"
        tittel="Anmeldelser på forsiden"
        beskrivelse="Skru av «Vises på nettsiden» på en anmeldelse for å skjule den uten å slette den. Rekkefølgen styrer hvilken som vises først."
        enhetsnavn="anmeldelse"
        tittelFelt="name"
        tomTekst="Dere har ingen anmeldelser ennå. Spør en fornøyd kunde om de vil si noen ord, og legg dem inn her."
        nyRad={{ name: '', place: '', quote: '', stars: 5, active: true }}
        radInfo={(rad) => {
          const n = Math.max(0, Math.min(5, Math.round(Number(rad.stars ?? 0))));
          const sitat = String(rad.quote ?? '');
          return (
            <>
              <span className="text-amber-500">{'★'.repeat(n)}</span>
              <span className="text-ink-300">{'★'.repeat(5 - n)}</span>
              {sitat && (
                <span className="ml-2 text-ink-500">
                  {sitat.length > 60 ? `${sitat.slice(0, 60)}…` : sitat}
                </span>
              )}
            </>
          );
        }}
        felter={[
          { key: 'name', label: 'Navn', type: 'text', placeholder: 'Kari N.', help: 'Spør kunden om det er greit å bruke navnet. Fornavn og forbokstav holder.' },
          { key: 'place', label: 'Hvem / hva', type: 'text', placeholder: 'Sandsli · kjøpte nøkkelholder', help: 'Står i liten skrift under navnet. Kan stå tomt.' },
          { key: 'quote', label: 'Hva de sa', type: 'longtext', bred: true, placeholder: 'Skriv anmeldelsen slik kunden sa den.' },
          {
            key: 'stars',
            label: 'Stjerner',
            type: 'stars',
            help: 'Sett det kunden faktisk ga. Er dere i tvil, la det stå på 5 bare hvis de var tydelig fornøyde.',
          },
        ]}
      />
    </div>
  );
}
