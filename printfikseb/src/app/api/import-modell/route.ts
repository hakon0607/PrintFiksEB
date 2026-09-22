import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { krevInnlogget, hentHemmelighet } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Skrap = { tittel: string; beskrivelse: string; bilder: string[] };

const NETTLESER_HEADERE = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'nb-NO,nb;q=0.9,no;q=0.8,en;q=0.7',
  'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

function avkod(t: string) {
  return t
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, k) => String.fromCharCode(parseInt(k, 16)))
    .trim();
}

/** Prøver å hente innholdet på siden. Returnerer null hvis alt blir blokkert. */
async function hentSide(url: string): Promise<{ tekst: string; blokkert: boolean } | null> {
  // 1) Rett fra kilden
  try {
    const res = await fetch(url, { headers: NETTLESER_HEADERE, cache: 'no-store' });
    if (res.ok) {
      const tekst = await res.text();
      if (tekst.length > 500) return { tekst, blokkert: false };
    }
  } catch {
    /* prøver neste */
  }

  // 2) Via en leser-tjeneste som klarer sider med bot-sperre
  for (const bygg of [
    (u: string) => `https://r.jina.ai/${u}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  ]) {
    try {
      const res = await fetch(bygg(url), {
        headers: { 'User-Agent': NETTLESER_HEADERE['User-Agent'] },
        cache: 'no-store',
        signal: AbortSignal.timeout(25000),
      });
      if (res.ok) {
        const tekst = await res.text();
        if (tekst.length > 300) return { tekst, blokkert: false };
      }
    } catch {
      /* prøver neste */
    }
  }

  return { tekst: '', blokkert: true };
}

/** Plukker ut tittel, beskrivelse og bilder fra HTML eller ren tekst. */
function skrap(innhold: string): Skrap {
  const meta = (navn: string) => {
    const m =
      innhold.match(
        new RegExp(`<meta[^>]+(?:property|name)=["']${navn}["'][^>]+content=["']([^"']+)["']`, 'i')
      ) ||
      innhold.match(
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${navn}["']`, 'i')
      );
    return m ? m[1] : '';
  };

  let tittel = avkod(meta('og:title') || meta('twitter:title'));
  if (!tittel) {
    const t = innhold.match(/<title>([^<]+)<\/title>/i) || innhold.match(/^Title:\s*(.+)$/m);
    tittel = t ? avkod(t[1]) : '';
  }
  tittel = tittel
    .replace(/\s*[-|–]\s*(MakerWorld|Printables|Thingiverse|Cults.*)$/i, '')
    .replace(/^(Download|Free)\s+/i, '')
    .trim();

  let beskrivelse = avkod(
    meta('og:description') || meta('description') || meta('twitter:description')
  );
  if (!beskrivelse) {
    // Ren tekst fra leser-tjenesten: ta de første avsnittene
    const ren = innhold
      .replace(/^(Title|URL Source|Markdown Content):.*$/gm, '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/[#*>`|]/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim();
    beskrivelse = ren.slice(0, 1500);
  }

  const bilder = new Set<string>();
  const hoved = meta('og:image') || meta('twitter:image');
  if (hoved) bilder.add(avkod(hoved));

  const treff = innhold.matchAll(
    /https?:\/\/[^"'\\\s)<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s)<>]*)?/gi
  );
  for (const t of treff) {
    const u = avkod(t[0]);
    if (/(avatar|logo|icon|favicon|sprite|placeholder|banner|badge|profile)/i.test(u)) continue;
    if (bilder.size >= 8) break;
    bilder.add(u);
  }

  return { tittel: tittel || '', beskrivelse, bilder: [...bilder].slice(0, 6) };
}

/** Lar AI skrive en norsk beskrivelse. */
async function skrivMedAi(
  apiKey: string,
  modell: string,
  data: { tittel: string; beskrivelse: string },
  url: string
) {
  const svar = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(40000),
    body: JSON.stringify({
      model: modell || 'gpt-4o-mini',
      temperature: 0.6,
      max_tokens: 900,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Du skriver produktsider på norsk bokmål for PrintFiksEB, en elevbedrift på ungdomsskolen som 3D-printer og selger ting. Skriv som en ordentlig nettbutikk: konkret, tydelig og lett å lese. Ingen salgsfloskler, ingen utropstegn, ingen overdrivelser. Svar kun med JSON.',
        },
        {
          role: 'user',
          content: `Informasjon om en 3D-modell${url ? ` (${url})` : ''}:

Tittel: ${data.tittel || '(ukjent)'}
Tekst: ${(data.beskrivelse || '').slice(0, 2500)}

Lag en ferdig produktside som JSON med disse feltene:
- "navn": kort norsk produktnavn, maks 4 ord
- "overskrift": én kort setning som selger poenget, maks 70 tegn. Ingen punktum på slutten.
- "kort": én til to setninger om hva det er (maks 200 tegn). Vises på kortet i galleriet.
- "full": 3-4 korte avsnitt: hva det er, hva det brukes til, hvordan det festes eller brukes, og hva som er praktisk med det. Skilt med tomme linjer. Ikke nevn hvor modellen er hentet fra, og ikke nevn pris.
- "punkter": liste med 3-5 korte kulepunkter (maks 60 tegn hver) med det viktigste – f.eks. mål, materiale, hva det passer til
- "kategori": ett ord, f.eks. Kontor, Kjøkken, Gaver, Oppbevaring, Bil, Verktøy
- "vekt": anslått vekt i gram som et tall
- "pris": hva du mener dette er verdt i norske kroner for en privatkunde, som et tall`,
        },
      ],
    }),
  });

  if (!svar.ok) return null;
  const json = await svar.json();
  const innhold = json?.choices?.[0]?.message?.content;
  if (!innhold) return null;
  try {
    return JSON.parse(innhold) as {
      navn?: string;
      overskrift?: string;
      kort?: string;
      full?: string;
      punkter?: string[];
      kategori?: string;
      vekt?: number;
      pris?: number;
    };
  } catch {
    return null;
  }
}

/** Laster ned et bilde og legger det i Supabase Storage. */
async function lastOppBilde(service: SupabaseClient, url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': NETTLESER_HEADERE['User-Agent'], Referer: 'https://makerworld.com/' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || 'image/jpeg';
    if (!type.startsWith('image/')) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength < 2000 || bytes.byteLength > 8 * 1024 * 1024) return null;

    const endelse = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
    const navn = `import/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${endelse}`;
    const { error } = await service.storage
      .from('bilder')
      .upload(navn, bytes, { contentType: type, cacheControl: '3600', upsert: false });
    if (error) return null;
    return service.storage.from('bilder').getPublicUrl(navn).data.publicUrl;
  } catch {
    return null;
  }
}

/** Gjør et tall om til en pen butikkpris: 49, 69, 99, 149, 199, 249 ... */
function penPris(verdi: number): number {
  const stiger = [
    19, 29, 39, 49, 59, 69, 79, 89, 99, 119, 129, 149, 169, 179, 199, 229, 249, 279, 299, 349, 399,
    449, 499, 599, 699, 799, 899, 999,
  ];
  const v = Math.max(19, Math.round(verdi));
  let naermest = stiger[0];
  for (const s of stiger) {
    if (Math.abs(s - v) < Math.abs(naermest - v)) naermest = s;
  }
  if (v > 999) return Math.round(v / 100) * 100 - 1;
  return naermest;
}

async function foreslattPris(service: SupabaseClient, vekt: number, aiPris?: number) {
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

  // Vår egen kostnad + litt for jobben
  const grunnlag = start * 0.5 + (vekt || 40) * perGram * 1.6;

  // Hvis AI-en foreslo noe fornuftig, legg det til i vurderingen
  const forslag = Number(aiPris) || 0;
  const rimelig = forslag >= grunnlag * 0.5 && forslag <= grunnlag * 2.5;
  const snitt = rimelig ? (grunnlag + forslag) / 2 : grunnlag;

  return penPris(snitt);
}

export async function POST(request: Request) {
  const sjekk = await krevInnlogget(request);
  if (sjekk.feil) return sjekk.feil;
  const service = sjekk.service;

  let body: {
    url?: string;
    manuell?: boolean;
    navn?: string;
    tekst?: string;
    bilder?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig forespørsel.' }, { status: 400 });
  }

  const url = (body.url || '').trim();
  const manuell = !!body.manuell;

  if (!manuell && !/^https?:\/\//i.test(url)) {
    return NextResponse.json(
      { error: 'Lim inn en hel lenke som starter med https://' },
      { status: 400 }
    );
  }

  let data: Skrap = { tittel: '', beskrivelse: '', bilder: [] };
  let alleredeOpplastet: string[] = [];

  if (manuell) {
    data = {
      tittel: (body.navn || '').trim(),
      beskrivelse: (body.tekst || '').trim(),
      bilder: [],
    };
    alleredeOpplastet = (body.bilder || []).filter((b) => typeof b === 'string' && b.startsWith('http'));
    if (!data.tittel && !data.beskrivelse) {
      return NextResponse.json(
        { error: 'Skriv i hvert fall et navn eller litt tekst, så lager vi resten.' },
        { status: 400 }
      );
    }
  } else {
    const side = await hentSide(url);
    if (!side || side.blokkert) {
      return NextResponse.json(
        {
          blokkert: true,
          error:
            'Nettstedet slipper oss ikke inn automatisk (de blokkerer roboter). Fyll inn selv i stedet – det tar et halvt minutt.',
        },
        { status: 200 }
      );
    }
    data = skrap(side.tekst);
    if (!data.tittel && !data.beskrivelse && !data.bilder.length) {
      return NextResponse.json(
        {
          blokkert: true,
          error: 'Fant ikke noe brukbart på siden. Fyll inn selv i stedet.',
        },
        { status: 200 }
      );
    }
  }

  // AI-tekst
  const apiKey = await hentHemmelighet(service, 'openai_api_key');
  let ai: Awaited<ReturnType<typeof skrivMedAi>> = null;
  let merknad = '';

  if (apiKey) {
    const { data: modellRad } = await service
      .from('settings')
      .select('value')
      .eq('key', 'ai_modell')
      .maybeSingle();
    try {
      ai = await skrivMedAi(apiKey, modellRad?.value || 'gpt-4o-mini', data, url);
      if (!ai) merknad = 'AI-en svarte ikke, så teksten er tatt rett fra det du ga oss.';
    } catch {
      merknad = 'Fikk ikke kontakt med AI-en, så teksten er tatt rett fra det du ga oss.';
    }
  } else {
    merknad = 'Ingen API-nøkkel er lagt inn, så teksten er ikke skrevet om av AI.';
  }

  // Bilder
  const bilder = [...alleredeOpplastet];
  for (const b of data.bilder) {
    if (bilder.length >= 5) break;
    const opplastet = await lastOppBilde(service, b);
    if (opplastet) bilder.push(opplastet);
  }

  const vekt = Number(ai?.vekt) || 0;
  const pris = await foreslattPris(service, vekt, Number(ai?.pris) || 0);

  const ny = {
    name: (ai?.navn || data.tittel || 'Ny modell').slice(0, 80),
    description: (ai?.kort || data.beskrivelse).slice(0, 400),
    details: ai?.full || data.beskrivelse,
    tagline: (ai?.overskrift || '').slice(0, 90),
    highlights: Array.isArray(ai?.punkter)
      ? ai!.punkter!.filter((p) => typeof p === 'string' && p.trim()).slice(0, 6)
      : [],
    price: pris,
    image_url: bilder[0] ?? '',
    images: bilder.slice(1),
    weight_g: vekt ? Math.round(vekt) : null,
    category: ai?.kategori || '',
    source_url: url,
    active: false,
    sort: 100,
  };

  const { data: produkt, error } = await service.from('products').insert(ny).select().single();
  if (error || !produkt) {
    return NextResponse.json(
      { error: 'Klarte ikke å lagre modellen i galleriet.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    produkt,
    antallBilder: bilder.length,
    brukteAi: !!ai,
    merknad,
  });
}
