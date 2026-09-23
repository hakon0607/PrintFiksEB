'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';
import { AiNokkel } from '@/components/admin/AiNokkel';
import { TableEditor, type Felt } from '@/components/admin/TableEditor';
import { regnMargin } from '@/lib/margin';
import { kr } from '@/lib/settings';
import type { Material } from '@/lib/types';

export default function GalleriAdmin() {
  const { profile, supabase } = useAdmin();
  const erEier = profile?.role === 'eier';
  const [materialer, setMaterialer] = useState<Material[]>([]);

  // Materialprisene brukes til å regne ut hva hver modell koster oss
  const hentMaterialer = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from('materials').select('*').order('sort');
    setMaterialer((data as Material[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    hentMaterialer();
  }, [hentMaterialer]);

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
    { key: 'price', label: 'Pris til kunden', type: 'price', suffix: 'kr' },
    {
      key: 'cost_price',
      label: 'Hva koster den oss',
      type: 'price',
      suffix: 'kr',
      help: 'Skriv inn hva modellen faktisk koster å lage. Står det 0, regner vi det ut fra vekt og materialpris.',
    },
    {
      key: 'cost_extra',
      label: 'Ekstra kostnad',
      type: 'price',
      suffix: 'kr',
      help: 'Ting som kommer i tillegg: metallring, tape, emballasje, lim. Legges alltid oppå.',
    },
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
        radInfo={(rad) => {
          const m = regnMargin(rad, materialer);
          if (!m.pris) return 'Ingen pris satt ennå';
          if (!m.egenKostpris && (!m.kjentMateriale || !m.vekt))
            return `${kr(m.pris)} · skriv inn hva den koster oss for å se margin`;
          return `${kr(m.pris)} · koster oss ${kr(m.kost)} · vi tjener ${kr(m.overskudd)}${
            m.prosent === null ? '' : ` (${Math.round(m.prosent)} %)`
          }`;
        }}
        radPanel={(rad) => <MarginKort rad={rad} materialer={materialer} />}
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
          cost_price: 0,
          cost_extra: 0,
          category: '',
          featured: false,
          active: true,
        }}
        felter={felter}
      />
    </div>
  );
}

/** Viser hva modellen koster oss og hva vi sitter igjen med. */
function MarginKort({
  rad,
  materialer,
}: {
  rad: Record<string, unknown>;
  materialer: Material[];
}) {
  const m = regnMargin(rad, materialer);
  const mangler = !m.egenKostpris && (!m.kjentMateriale || !m.vekt);

  if (mangler) {
    return (
      <div className="rounded-2xl bg-ink-50 px-4 py-3 text-sm text-ink-600">
        Skriv inn <span className="font-semibold text-ink-800">hva den koster oss</span> – eller fyll
        ut <span className="font-semibold text-ink-800">materiale</span> og{' '}
        <span className="font-semibold text-ink-800">vekt i gram</span>, så regner vi det ut for
        dere.
      </div>
    );
  }

  const bra = m.overskudd > 0;

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">
        Hva tjener vi på denne?
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-ink-50 px-3.5 py-3">
          <p className="text-xs font-semibold text-ink-500">Koster oss</p>
          <p className="mt-0.5 text-xl font-bold text-ink-900">{kr(m.kost)}</p>
        </div>
        <div className="rounded-xl bg-ink-50 px-3.5 py-3">
          <p className="text-xs font-semibold text-ink-500">Kunden betaler</p>
          <p className="mt-0.5 text-xl font-bold text-ink-900">{kr(m.pris)}</p>
        </div>
        <div className={`rounded-xl px-3.5 py-3 ${bra ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <p className={`text-xs font-semibold ${bra ? 'text-emerald-700' : 'text-red-600'}`}>
            {bra ? 'Vi tjener' : 'Vi taper'}
          </p>
          <p className={`mt-0.5 text-xl font-bold ${bra ? 'text-emerald-700' : 'text-red-600'}`}>
            {kr(Math.abs(m.overskudd))}
            {m.prosent === null ? '' : (
              <span className="ml-1 text-sm font-semibold">({Math.round(m.prosent)} %)</span>
            )}
          </p>
        </div>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-ink-600">
        {m.egenKostpris ? (
          <>
            Dere har satt kostprisen selv til {kr(m.materialkost)}
            {m.ekstra > 0 ? ` + ${kr(m.ekstra)} i ekstra` : ''}. Tøm feltet «Hva koster den oss», så
            regner vi den ut fra vekt og materialpris i stedet.
          </>
        ) : (
          <>
            {m.vekt} g {String(rad.material ?? '')} ×{' '}
            {m.perGram.toLocaleString('nb-NO', { minimumFractionDigits: 2 })} kr ={' '}
            {kr(m.materialkost)} i plast{m.ekstra > 0 ? ` + ${kr(m.ekstra)} i ekstra` : ''}.
            Materialprisen hentes fra <span className="font-semibold text-ink-800">Priser</span>, så
            den endrer seg hvis dere endrer den der.
          </>
        )}
      </p>

      {!bra && (
        <p className="mt-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] font-semibold text-red-700">
          Prisen er lavere enn det koster å lage modellen. Sett prisen opp, eller bruk mindre plast.
        </p>
      )}
    </div>
  );
}
