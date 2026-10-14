'use client';

import { SettingsEditor } from '@/components/admin/SettingsEditor';
import { TableEditor } from '@/components/admin/TableEditor';

export default function AnmeldelserSide() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Anmeldelser</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          Det kundene sier om dere. Kundene kan skrive selv via lenken i «Takk for handelen»-e-posten – da
          dukker anmeldelsen opp her merket <span className="font-semibold text-amber-700">Ny fra kunde</span>,
          skjult. Slå på bryteren for de dere vil vise, og trykk «Publiser». Er det flere enn én, bytter de
          på forsiden.
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
          const fraKunde = rad.kilde === 'kunde';
          return (
            <>
              {fraKunde && !rad.active && (
                <span className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  Ny fra kunde – skjult
                </span>
              )}
              {fraKunde && rad.active === true && (
                <span className="mr-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                  Fra kunde
                </span>
              )}
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

      <SettingsEditor
        grupper={['Forsiden']}
        beskrivelser={{
          Forsiden: 'Overskriften over anmeldelsene, og hvor fort de bytter.',
        }}
      />
    </div>
  );
}
