'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from './AdminProvider';
import { TableEditor, type Felt } from './TableEditor';
import { DEKSEL_KODE } from '@/lib/deksel/produkt';

/**
 * Dekselet som produkt i galleriet. Det er et helt vanlig produkt
 * (samme kort, kategori, forside osv.) – det redigeres bare her.
 */
export function DekselProdukt() {
  const { supabase } = useAdmin();
  const [finnes, setFinnes] = useState<boolean | null>(null);
  const [kategorier, setKategorier] = useState<string[]>([]);
  const [feil, setFeil] = useState('');

  const sjekk = useCallback(async () => {
    if (!supabase) return;
    const [d, k] = await Promise.all([
      supabase.from('products').select('id').eq('code', DEKSEL_KODE).maybeSingle(),
      supabase.from('products').select('category'),
    ]);
    setFinnes(!!d.data);
    const sett = new Map<string, string>();
    for (const rad of ((k.data as { category: string | null }[]) ?? [])) {
      const n = (rad.category ?? '').trim();
      if (n && !sett.has(n.toLowerCase())) sett.set(n.toLowerCase(), n);
    }
    setKategorier([...sett.values()].sort((a, b) => a.localeCompare(b, 'nb')));
  }, [supabase]);

  useEffect(() => { sjekk(); }, [sjekk]);

  async function opprett() {
    if (!supabase) return;
    setFeil('');
    const { error } = await supabase.from('products').insert({
      code: DEKSEL_KODE,
      name: 'Mobildeksel med eget motiv',
      tagline: 'Ditt bilde eller din logo – printet rett inn i dekselet',
      description: 'Last opp et bilde, flytt det dit du vil og velg farger. Du ser med en gang hvordan dekselet blir.',
      details: '',
      highlights: ['Fast pris – vi setter i gang med en gang', 'Velg dekselfarge og opptil 3 farger i motivet'],
      price: 69,
      image_url: '/deksel/kort.jpg',
      images: [],
      material: 'PLA',
      category: 'Mobildeksel',
      featured: true,
      active: true,
      sort: 5,
    });
    if (error) setFeil(`Klarte ikke å opprette: ${error.message}`);
    else sjekk();
  }

  if (finnes === null) return <div className="h-32 animate-pulse rounded-3xl bg-white/70" />;

  if (!finnes) {
    return (
      <div className="rounded-3xl border border-dashed border-ink-200 bg-white p-6">
        <p className="font-semibold text-ink-800">Dekselet ligger ikke i galleriet ennå</p>
        <p className="mt-1 text-sm text-ink-600">Trykk under, så legges det inn som et vanlig produkt med ferdig tekst og bilde.</p>
        <button type="button" onClick={opprett} className="btn-primary btn-sm mt-4">Legg dekselet i galleriet</button>
        {feil && <p className="mt-3 text-sm font-semibold text-red-600">{feil}</p>}
      </div>
    );
  }

  const felter: Felt[] = [
    { key: 'image_url', label: 'Bilder', type: 'bildesett' },
    { key: 'name', label: 'Navn', type: 'text' },
    { key: 'tagline', label: 'Undertittel', type: 'text', help: 'Vises under navnet på produktsiden.' },
    {
      key: 'category',
      label: 'Kategori',
      type: 'text',
      forslag: kategorier,
      help: 'Hvilken del av galleriet dekselet står i.',
    },
    {
      key: 'description',
      label: 'Kort beskrivelse',
      type: 'longtext',
      help: 'Vises på kortet i galleriet og øverst på produktsiden.',
    },
    {
      key: 'details',
      label: 'Full beskrivelse',
      type: 'longtext',
      help: 'Vises under generatoren. Tom linje mellom avsnitt.',
    },
    { key: 'highlights', label: 'Kulepunkter', type: 'lines', help: 'Ett punkt per linje. Vises under generatoren.' },
    { key: 'featured', label: 'Vis på forsiden', type: 'bool', help: 'Merkes som «Populær» og vises på forsiden.' },
  ];

  return (
    <TableEditor
      table="products"
      tittel="Produktet i galleriet"
      beskrivelse="Slik ser dekselet ut i galleriet. Prisen på kortet regnes ut selv: grunnpris + én farge. Bryteren til høyre skjuler dekselet fra nettsiden."
      enhetsnavn="produkt"
      tittelFelt="name"
      nyRad={{}}
      felter={felter}
      skjulLeggTil
      filter={(rad) => String(rad.code ?? '').trim().toLowerCase() === DEKSEL_KODE}
    />
  );
}
