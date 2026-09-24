import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/server';
import {
  finnMottakere,
  gyldigEpost,
  sendEnkeltvis,
  varselEpost,
  type EpostLinje,
} from '@/lib/epost';

export const dynamic = 'force-dynamic';

type Vare = {
  navn?: unknown;
  antall?: unknown;
  pris?: unknown;        // vist pris, f.eks. "8–40 kr"
  prisMin?: unknown;
  prisMaks?: unknown;
  produktId?: unknown;
  kode?: unknown;
  type?: unknown;        // galleri | egen
};

type Innsendt = {
  navn?: unknown;
  telefon?: unknown;
  epost?: unknown;
  adresse?: unknown;
  levering?: unknown;
  betaling?: unknown;
  kommentar?: unknown;
  beskrivelse?: unknown;
  sum?: unknown;
  sumMin?: unknown;
  sumMaks?: unknown;
  varer?: unknown;
};

function tekst(v: unknown, maks = 400): string {
  return String(v ?? '').trim().slice(0, maks);
}

function tall(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function gyldigTelefon(t: string): boolean {
  return t.replace(/\D/g, '').length >= 8;
}

export async function POST(request: Request) {
  const service = getServiceClient();
  if (!service) {
    return NextResponse.json({ feil: 'Databasen er ikke satt opp.' }, { status: 500 });
  }

  let body: Innsendt;
  try {
    body = (await request.json()) as Innsendt;
  } catch {
    return NextResponse.json({ feil: 'Ugyldig innhold.' }, { status: 400 });
  }

  const navn = tekst(body.navn, 120);
  const telefon = tekst(body.telefon, 40);
  const epost = tekst(body.epost, 160).toLowerCase();
  const adresse = tekst(body.adresse, 200);
  const levering = tekst(body.levering, 60) || 'Henting';
  const betaling = tekst(body.betaling, 40) || 'Vipps';
  const kommentar = tekst(body.kommentar, 1000);
  const beskrivelse = tekst(body.beskrivelse, 1000);
  const varer = Array.isArray(body.varer) ? (body.varer as Vare[]).slice(0, 30) : [];
  const vilkarGodtatt = Boolean((body as { vilkarGodtatt?: unknown }).vilkarGodtatt);

  // Bare ferdige modeller fra galleriet = fast pris, ingen godkjenning
  const bareFastPris =
    varer.length > 0 && varer.every((v) => tekst(v.type, 20) === 'galleri') && !beskrivelse;

  if (navn.split(' ').filter(Boolean).length < 2) {
    return NextResponse.json({ feil: 'Skriv hele navnet ditt, både fornavn og etternavn.' }, { status: 400 });
  }
  if (!gyldigTelefon(telefon)) {
    return NextResponse.json({ feil: 'Skriv et gyldig mobilnummer.' }, { status: 400 });
  }
  if (!gyldigEpost(epost)) {
    return NextResponse.json({ feil: 'Skriv en gyldig e-postadresse.' }, { status: 400 });
  }
  if (levering.toLowerCase().includes('lever') && !adresse) {
    return NextResponse.json({ feil: 'Skriv adressen når du vil ha hjemlevering.' }, { status: 400 });
  }
  if (varer.length === 0 && !beskrivelse) {
    return NextResponse.json({ feil: 'Legg til minst én ting, eller beskriv hva du vil ha.' }, { status: 400 });
  }

  // Innstillinger vi trenger til e-posten
  const { data: innst } = await service
    .from('settings')
    .select('key,value')
    .in('key', [
      'bedrift_navn',
      'kontakt_telefon',
      'epost_avsender',
      'epost_bedrift',
      'levering_dager_min',
      'levering_dager_maks',
      'nettside_url',
    ]);
  const s: Record<string, string> = {};
  for (const rad of ((innst as { key: string; value: string }[]) ?? [])) s[rad.key] = rad.value;

  const bedrift = s.bedrift_navn || 'PrintFiksEB';
  const bedriftTelefon = s.kontakt_telefon || '41381608';
  const avsender = s.epost_avsender || 'PrintFiksEB <onboarding@resend.dev>';
  const leveringstid = `${s.levering_dager_min || '2'}–${s.levering_dager_maks || '4'} virkedager`;

  const hva =
    varer
      .map((v) => `${Math.max(1, tall(v.antall) || 1)}x ${tekst(v.navn, 120) || 'Uten navn'}`)
      .join(', ') || beskrivelse;

  // 1. Selve bestillingen
  const { data: ordre, error } = await service
    .from('orders')
    .insert({
      kunde: navn,
      telefon,
      epost,
      adresse,
      hva,
      notat: [beskrivelse, kommentar].filter(Boolean).join('\n\n'),
      levering,
      betalingsmate: betaling,
      pris: tall(body.sumMin),
      status: 'ny',
      kilde: 'nett',
      krever_godkjenning: !bareFastPris,
      vilkar_godtatt: vilkarGodtatt,
      opprettet_av: 'Nettsiden',
    })
    .select()
    .single();

  if (error || !ordre) {
    return NextResponse.json({ feil: 'Klarte ikke å lagre bestillingen.' }, { status: 500 });
  }

  const o = ordre as { id: string; ordrenr: string | null };

  // 2. Varelinjene
  if (varer.length > 0) {
    const rader = varer.map((v, i) => ({
      order_id: o.id,
      product_id: tekst(v.produktId, 60) || null,
      code: tekst(v.kode, 20),
      name: tekst(v.navn, 160) || 'Uten navn',
      qty: Math.max(1, Math.round(tall(v.antall) || 1)),
      unit_price: tall(v.prisMin),
      unit_cost: 0,
      kind: tekst(v.type, 20) === 'galleri' ? 'galleri' : 'egen',
      sort: (i + 1) * 10,
    }));
    await service.from('order_items').insert(rader);
  }

  const ordrenr = o.ordrenr ?? '';

  // 3. Varsel til oss. Kunden får kvitteringen på melding fra oss.
  const linjer: EpostLinje[] = varer.map((v) => ({
    navn: tekst(v.navn, 160) || 'Uten navn',
    antall: Math.max(1, Math.round(tall(v.antall) || 1)),
    pris: tekst(v.pris, 40) || 'Etter avtale',
  }));
  if (linjer.length === 0 && beskrivelse) {
    linjer.push({ navn: beskrivelse.slice(0, 120), antall: 1, pris: 'Etter avtale' });
  }

  const kvittering = {
    ordrenr,
    kunde: navn,
    telefon,
    epost,
    adresse,
    levering,
    betaling,
    kommentar,
    linjer,
    sum: tekst(body.sum, 40) || 'Etter avtale',
    bedrift,
    bedriftTelefon,
    nettside: s.nettside_url || new URL(request.url).origin,
    leveringstid,
    fastPris: bareFastPris,
  };

  // Hvem av oss skal ha varsel?
  const mottakere = await finnMottakere(service, s.epost_bedrift ?? '');

  const varsel = varselEpost(kvittering);

  const tilOss =
    mottakere.adresser.length > 0
      ? await sendEnkeltvis({
          til: mottakere.adresser,
          emne: varsel.emne,
          html: varsel.html,
          tekst: varsel.tekst,
          avsender,
          svarTil: epost,
        })
      : {
          ok: false,
          sendt: [] as string[],
          feilet: [{ til: '(ingen)', feil: 'Ingen i bedriften har lagt inn e-postadresse' }],
        };

  // Skriv ned hva som faktisk skjedde, så dere ser det i admin.
  const status =
    tilOss.sendt.length > 0
      ? `Varsel sendt til ${tilOss.sendt.join(', ')}`
      : ['Varsel feilet', ...tilOss.feilet.map((f) => `${f.til}: ${f.feil}`)].join(' | ');

  if (!tilOss.ok) {
    console.error('[bestilling] varselet gikk ikke ut', {
      ordrenr,
      feilet: tilOss.feilet,
      avsender,
    });
  }

  await service.from('orders').update({ epost_status: status.slice(0, 500) }).eq('id', o.id);

  return NextResponse.json({
    ok: true,
    ordrenr,
    fastPris: bareFastPris,
    varselSendt: tilOss.ok,
  });
}
