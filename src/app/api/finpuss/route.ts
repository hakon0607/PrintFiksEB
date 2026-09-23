import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { krevInnlogget, hentHemmelighet } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

type Felter = {
  navn?: string;
  undertittel?: string;
  kort?: string;
  full?: string;
  punkter?: string[];
  kategori?: string;
  vekt?: number | null;
  pris?: number | null;
  materiale?: string;
};

/** Gjør et tall om til en pen butikkpris: 49, 69, 99, 149, 199 ... */
function penPris(verdi: number): number {
  const stiger = [
    19, 29, 39, 49, 59, 69, 79, 89, 99, 119, 129, 149, 169, 179, 199, 229, 249, 279, 299, 349, 399,
    449, 499, 599, 699, 799, 899, 999,
  ];
  const v = Math.max(19, Math.round(verdi));
  if (v > 999) return Math.round(v / 100) * 100 - 1;
  let naermest = stiger[0];
  for (const s of stiger) {
    if (Math.abs(s - v) < Math.abs(naermest - v)) naermest = s;
  }
  return naermest;
}

async function prisGrunnlag(service: SupabaseClient, vekt: number) {
  const { data: rad } = await service
    .from('settings')
    .select('value')
    .eq('key', 'pris_startpris')
    .maybeSingle();
  const start = Number(rad?.value ?? 100);
  const { data: mat } = await service
    .from('materials')
    .select('price_per_gram')
    .eq('active', true)
    .order('sort')
    .limit(1)
    .maybeSingle();
  const perGram = Number(mat?.price_per_gram ?? 0.8);
  return start * 0.5 + (vekt || 40) * perGram * 1.6;
}

export async function POST(request: Request) {
  const sjekk = await krevInnlogget(request);
  if (sjekk.feil) return sjekk.feil;
  const service = sjekk.service;

  let body: { felter?: Felter };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig forespørsel.' }, { status: 400 });
  }

  const f = body.felter ?? {};
  const harNoe =
    (f.navn || '').trim() || (f.kort || '').trim() || (f.full || '').trim() || (f.undertittel || '').trim();

  if (!harNoe) {
    return NextResponse.json(
      { error: 'Skriv i hvert fall et navn eller litt beskrivelse først, så finpusser vi det.' },
      { status: 400 }
    );
  }

  const apiKey = await hentHemmelighet(service, 'openai_api_key');
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'Ingen AI-nøkkel er lagt inn ennå. Eieren må legge den inn øverst på denne siden først.',
      },
      { status: 400 }
    );
  }

  const { data: modellRad } = await service
    .from('settings')
    .select('value')
    .eq('key', 'ai_modell')
    .maybeSingle();

  let svar: Response;
  try {
    svar = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(35000),
      body: JSON.stringify({
        model: modellRad?.value || 'gpt-4o-mini',
        temperature: 0.6,
        max_tokens: 900,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Du finpusser produktsider på norsk bokmål for PrintFiksEB, en elevbedrift på ungdomsskolen som 3D-printer og selger ting. Skriv som en ordentlig nettbutikk: konkret, tydelig og lett å lese. Ingen salgsfloskler, ingen utropstegn, ingen overdrivelser, ingen emojier. Behold alltid det de faktisk har skrevet – du rydder og gjør det bedre. Felter de har latt stå tomme fyller du ut selv, ut fra navnet og resten av det de har skrevet. Ikke finn på egenskaper produktet åpenbart ikke har, men gjett gjerne fornuftig på det som er vanlig for en slik ting. Svar kun med JSON.',
          },
          {
            role: 'user',
            content: `Her er det vi har skrevet om en 3D-printet ting. Finpuss det, og fyll ut alt som står som (mangler).

Navn: ${f.navn || '(mangler)'}
Undertittel: ${f.undertittel || '(mangler)'}
Kort beskrivelse: ${f.kort || '(mangler)'}
Full beskrivelse: ${(f.full || '(mangler)').slice(0, 2500)}
Kulepunkter: ${(f.punkter || []).join(' | ') || '(mangler)'}
Kategori: ${f.kategori || '(mangler)'}
Materiale: ${f.materiale || 'PLA'}
Vekt i gram: ${f.vekt || '(ukjent)'}

Svar med JSON:
- "navn": ryddet produktnavn på norsk, maks 4 ord
- "undertittel": én kort setning som selger poenget, maks 70 tegn, uten punktum til slutt
- "kort": én til to setninger om hva det er, maks 200 tegn. Vises på kortet i galleriet.
- "full": 3-4 korte avsnitt: hva det er, hva det brukes til, hvordan det festes eller brukes, og hva som er praktisk med det. Skilt med tomme linjer. Ikke nevn pris.
- "punkter": liste med 3-5 korte kulepunkter, maks 60 tegn hver
- "kategori": ett ord, f.eks. Kontor, Kjøkken, Gaver, Oppbevaring, Bil, Verktøy
- "vekt": anslått vekt i gram som et tall
- "pris": hva du mener dette er verdt for en privatkunde i norske kroner, som et tall`,
          },
        ],
      }),
    });
  } catch {
    return NextResponse.json(
      { error: 'Fikk ikke kontakt med AI-en. Prøv igjen om litt.' },
      { status: 502 }
    );
  }

  if (!svar.ok) {
    const status = svar.status;
    return NextResponse.json(
      {
        error:
          status === 401
            ? 'AI-nøkkelen ble ikke godtatt. Eieren må legge inn en ny.'
            : status === 429
              ? 'AI-en er opptatt eller tom for kvote. Prøv igjen om litt.'
              : 'AI-en svarte ikke som forventet. Prøv igjen.',
      },
      { status: 502 }
    );
  }

  let ai: Felter & { pris?: number };
  try {
    const json = await svar.json();
    ai = JSON.parse(json?.choices?.[0]?.message?.content ?? '{}');
  } catch {
    return NextResponse.json({ error: 'Klarte ikke å lese svaret fra AI-en.' }, { status: 502 });
  }

  const vekt = Number(ai.vekt) || Number(f.vekt) || 0;
  const grunnlag = await prisGrunnlag(service, vekt);
  const forslag = Number(ai.pris) || 0;
  const rimelig = forslag >= grunnlag * 0.5 && forslag <= grunnlag * 2.5;
  const pris = penPris(rimelig ? (grunnlag + forslag) / 2 : grunnlag);

  return NextResponse.json({
    ok: true,
    forslag: {
      navn: (ai.navn || f.navn || '').slice(0, 80),
      undertittel: (ai.undertittel || '').slice(0, 90),
      kort: (ai.kort || '').slice(0, 400),
      full: ai.full || f.full || '',
      punkter: Array.isArray(ai.punkter)
        ? ai.punkter.filter((p) => typeof p === 'string' && p.trim()).slice(0, 6)
        : [],
      kategori: ai.kategori || f.kategori || '',
      vekt: vekt ? Math.round(vekt) : null,
      pris,
    },
  });
}
