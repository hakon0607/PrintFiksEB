import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { krevInnlogget, hentHemmelighet } from '@/lib/server-auth';
import { lesLisens, type Lisensdom } from '@/lib/lisens';
import { avkod, finnDesigner, finnVekt, meta } from '@/lib/skrap';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Sider vi vet hvordan ser ut. Andre går også, men da gjetter vi mer. */
const KJENTE = ['makerworld.com', 'printables.com', 'thingiverse.com', 'thangs.com'];

type Funnet = {
  tittel: string;
  beskrivelse: string;
  bilde: string;
  designer: string;
  vekt: number | null;
  lisens: Lisensdom;
  nettsted: string;
};

async function proev(url: string, via: 'direkte' | 'leser'): Promise<{ html: string } | { feil: string }> {
  // MakerWorld og Printables stenger ute servere. Da går vi via en lesetjeneste
  // som åpner siden i en ekte nettleser og gir oss innholdet tilbake.
  const adresse = via === 'leser' ? `https://r.jina.ai/${url}` : url;
  try {
    const res = await fetch(adresse, {
      redirect: 'follow',
      signal: AbortSignal.timeout(via === 'leser' ? 32000 : 15000),
      headers:
        via === 'leser'
          ? { 'X-Return-Format': 'html', Accept: 'text/html,text/plain' }
          : {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
              'Accept-Language': 'en,nb;q=0.8',
              Accept: 'text/html,application/xhtml+xml',
            },
    });
    if (!res.ok) return { feil: `${via} svarte ${res.status}` };
    const html = (await res.text()).slice(0, 900000);
    if (html.trim().length < 200) return { feil: `${via} ga nesten ingenting` };
    return { html };
  } catch {
    return { feil: `${via} svarte ikke i tide` };
  }
}

/** Prøver først rett på, så via lesetjenesten. */
async function hentSide(url: string): Promise<{ html: string; via: string } | { feil: string }> {
  const grunner: string[] = [];

  const direkte = await proev(url, 'direkte');
  if ('html' in direkte && /og:title|<title>/i.test(direkte.html)) {
    return { html: direkte.html, via: 'direkte' };
  }
  grunner.push('feil' in direkte ? direkte.feil : 'direkte ga ingen tittel');

  const leser = await proev(url, 'leser');
  if ('html' in leser) return { html: leser.html, via: 'leser' };
  grunner.push(leser.feil);

  return {
    feil: `Kom ikke inn på siden (${grunner.join(', ')}). Åpne modellsiden i nettleseren, marker alt med Ctrl+A, kopier, og lim det inn i feltet under i stedet.`,
  };
}

/** Pen butikkpris: 49, 69, 99, 149 ... */
function penPris(verdi: number): number {
  const stiger = [
    19, 29, 39, 49, 59, 69, 79, 89, 99, 119, 129, 149, 169, 179, 199, 229, 249, 279, 299, 349, 399,
    449, 499, 599, 699, 799, 899, 999,
  ];
  const v = Math.max(19, Math.round(verdi));
  if (v > 999) return Math.round(v / 100) * 100 - 1;
  let naermest = stiger[0];
  for (const s of stiger) if (Math.abs(s - v) < Math.abs(naermest - v)) naermest = s;
  return naermest;
}

async function prisdata(service: SupabaseClient) {
  const { data: innst } = await service
    .from('settings')
    .select('key,value')
    .in('key', ['pris_startpris', 'pris_valuta']);
  const s: Record<string, string> = {};
  for (const r of ((innst as { key: string; value: string }[]) ?? [])) s[r.key] = r.value;

  const { data: mat } = await service
    .from('materials')
    .select('name,price_per_gram')
    .eq('active', true)
    .order('sort')
    .limit(1)
    .maybeSingle();

  return {
    startpris: Number(s.pris_startpris ?? 100),
    perGram: Number((mat as { price_per_gram?: number } | null)?.price_per_gram ?? 0.8),
    materiale: String((mat as { name?: string } | null)?.name ?? 'PLA'),
  };
}

export async function POST(request: Request) {
  const okt = await krevInnlogget(request);
  if (okt.feil) return okt.feil;
  const service = okt.service;

  const body = (await request.json().catch(() => ({}))) as { url?: string; tekst?: string };
  const raa = String(body.url ?? '').trim();
  const limt = String(body.tekst ?? '').trim();
  if (!raa && !limt) {
    return NextResponse.json({ feil: 'Lim inn en lenke først.' }, { status: 400 });
  }

  let url: URL | null = null;
  if (raa) {
    try {
      url = new URL(raa.startsWith('http') ? raa : `https://${raa}`);
    } catch {
      return NextResponse.json({ feil: 'Det ser ikke ut som en lenke.' }, { status: 400 });
    }
    if (!/^https?:$/.test(url.protocol)) {
      return NextResponse.json({ feil: 'Bare vanlige nettadresser går.' }, { status: 400 });
    }
  }

  let html: string;
  let via = 'innlimt';
  if (limt) {
    // De har limt inn teksten fra siden selv
    html = limt.slice(0, 200000);
  } else {
    const side = await hentSide(url!.toString());
    if ('feil' in side) {
      return NextResponse.json({ feil: side.feil, kanLimeInn: true }, { status: 502 });
    }
    html = side.html;
    via = side.via;
  }

  const nettsted = url ? url.hostname.replace(/^www\./, '') : 'innlimt tekst';
  const funnet: Funnet = {
    tittel:
      meta(html, 'og:title', 'twitter:title') ||
      (html.match(/<title>([^<]{2,160})</i) ?? [])[1] ||
      (html.match(/^\s*#\s+(.{2,160})$/m) ?? [])[1] ||
      (html.match(/^Title:\s*(.{2,160})$/mi) ?? [])[1] ||
      (limt ? limt.split('\n').map((l) => l.trim()).find((l) => l.length > 2 && l.length < 120) ?? '' : ''),
    beskrivelse:
      meta(html, 'og:description', 'description', 'twitter:description') ||
      (limt ? limt.replace(/\s+/g, ' ').slice(0, 1500) : ''),
    bilde: meta(html, 'og:image', 'og:image:secure_url', 'twitter:image'),
    designer: finnDesigner(html, nettsted),
    vekt: finnVekt(html),
    lisens: lesLisens(html),
    nettsted,
  };

  // Rydd bort nettstedsnavnet fra tittelen
  funnet.tittel = avkod(funnet.tittel)
    .replace(/\s*[|\-–]\s*(MakerWorld|Printables\.com|Printables|Thingiverse|Thangs)\s*$/i, '')
    .replace(/^Print(ables)?\s*[-–|]\s*/i, '')
    .trim();

  if (!funnet.tittel) {
    return NextResponse.json(
      {
        feil:
          'Fant ingenting å hente på den siden. Noen sider skjuler innholdet bak innlogging – da må dere fylle inn selv.',
      },
      { status: 422 }
    );
  }

  const pris = await prisdata(service);

  // ---------- AI: norsk navn og beskrivelse ----------
  const apiKey = await hentHemmelighet(service, 'openai_api_key');
  let ai: Record<string, unknown> = {};
  let aiFeil = '';

  if (!apiKey) {
    aiFeil = 'Ingen AI-nøkkel er lagt inn, så navn og tekst må skrives selv.';
  } else {
    const { data: modellRad } = await service
      .from('settings')
      .select('value')
      .eq('key', 'ai_modell')
      .maybeSingle();

    try {
      const svar = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(40000),
        body: JSON.stringify({
          model: modellRad?.value || 'gpt-4o-mini',
          temperature: 0.5,
          max_tokens: 900,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'Du lager produkttekster på norsk bokmål for PrintFiksEB, en elevbedrift på ungdomsskolen som 3D-printer og selger ting. Du får informasjon om en modell hentet fra en engelsk modellside. Oversett og skriv om til naturlig norsk – ikke oversett ord for ord, og ikke behold engelske uttrykk. Skriv som en ordentlig nettbutikk: konkret, tydelig, uten salgsfloskler, utropstegn eller emojier. Ikke nevn hvor modellen er hentet fra, og ikke nevn pris. Svar kun med JSON.',
            },
            {
              role: 'user',
              content: `Modell hentet fra ${funnet.nettsted}:

Tittel: ${funnet.tittel}
Beskrivelse: ${(funnet.beskrivelse || '(mangler)').slice(0, 1800)}
Oppgitt filamentvekt: ${funnet.vekt ? `${funnet.vekt} gram` : '(ukjent)'}

Svar med JSON:
- "navn": norsk produktnavn, maks 4 ord, ingen engelske ord
- "undertittel": én kort setning som selger poenget, maks 70 tegn, uten punktum
- "kort": én til to setninger om hva det er, maks 200 tegn
- "full": 3-4 korte avsnitt: hva det er, hva det brukes til, hvordan det festes eller brukes, og hva som er praktisk med det. Skilt med tomme linjer.
- "punkter": 3-5 korte kulepunkter, maks 60 tegn hver
- "kategori": ett norsk ord, f.eks. Kontor, Kjøkken, Gaver, Oppbevaring, Bil, Verktøy, Bad
- "vekt": anslått vekt i gram som tall. Bruk den oppgitte vekten hvis den finnes, ellers anslå ut fra hva slags ting det er.
- "pris": hva du mener en privatkunde i Norge vil betale, som tall i kroner`,
            },
          ],
        }),
      });
      if (svar.ok) {
        const data = (await svar.json()) as { choices?: { message?: { content?: string } }[] };
        ai = JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
      } else {
        aiFeil =
          svar.status === 401
            ? 'AI-nøkkelen ble ikke godtatt, så teksten må skrives selv.'
            : 'AI-en svarte ikke, så teksten må skrives selv.';
      }
    } catch {
      aiFeil = 'AI-en svarte ikke i tide, så teksten må skrives selv.';
    }
  }

  const tall = (v: unknown, reserve: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : reserve;
  };

  const vekt = Math.round(tall(ai.vekt ?? funnet.vekt, funnet.vekt ?? 45));
  const materialkost = vekt * pris.perGram;
  const vårKost = Math.round(materialkost * 10) / 10;

  // Forslag til pris: AI-ens forslag, men aldri under det det koster oss
  const gulv = pris.startpris * 0.5 + materialkost * 1.6;
  const foreslattPris = penPris(Math.max(tall(ai.pris, gulv), gulv));

  return NextResponse.json({
    ok: true,
    kilde: {
      url: url ? url.toString() : '',
      nettsted: funnet.nettsted,
      designer: funnet.designer,
      kjent: KJENTE.some((k) => funnet.nettsted.endsWith(k)),
      via,
      originalTittel: funnet.tittel,
      bilde: funnet.bilde,
      vektFunnet: funnet.vekt,
    },
    lisens: funnet.lisens,
    forslag: {
      name: String(ai.navn ?? funnet.tittel).slice(0, 80),
      tagline: String(ai.undertittel ?? '').slice(0, 90),
      description: String(ai.kort ?? funnet.beskrivelse ?? '').slice(0, 400),
      details: String(ai.full ?? '').slice(0, 3000),
      highlights: Array.isArray(ai.punkter) ? (ai.punkter as string[]).slice(0, 5).map(String) : [],
      category: String(ai.kategori ?? '').slice(0, 30),
      material: pris.materiale,
      weight_g: vekt,
      price: foreslattPris,
      cost_price: vårKost,
    },
    regnestykke: {
      vekt,
      perGram: pris.perGram,
      materialkost: Math.round(materialkost * 10) / 10,
      materiale: pris.materiale,
      fortjeneste: Math.round((foreslattPris - vårKost) * 10) / 10,
    },
    aiFeil,
  });
}
