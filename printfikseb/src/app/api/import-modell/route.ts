import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { krevInnlogget, hentHemmelighet } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Skrap = {
  tittel: string;
  beskrivelse: string;
  bilder: string[];
};

/** Plukker ut tittel, beskrivelse og bilder fra HTML-en på modellsiden. */
function skrap(html: string, url: string): Skrap {
  const meta = (navn: string) => {
    const m =
      html.match(
        new RegExp(`<meta[^>]+(?:property|name)=["']${navn}["'][^>]+content=["']([^"']+)["']`, 'i')
      ) ||
      html.match(
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${navn}["']`, 'i')
      );
    return m ? m[1] : '';
  };

  const avkod = (t: string) =>
    t
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, k) => String.fromCharCode(parseInt(k, 16)))
      .trim();

  let tittel = avkod(meta('og:title') || meta('twitter:title'));
  if (!tittel) {
    const t = html.match(/<title>([^<]+)<\/title>/i);
    tittel = t ? avkod(t[1]) : '';
  }
  tittel = tittel
    .replace(/\s*[-|–]\s*(MakerWorld|Printables|Thingiverse|Cults.*)$/i, '')
    .replace(/^Download\s+/i, '')
    .trim();

  const beskrivelse = avkod(meta('og:description') || meta('description') || meta('twitter:description'));

  const bilder = new Set<string>();
  const hoved = meta('og:image') || meta('twitter:image');
  if (hoved) bilder.add(avkod(hoved));

  // Bildeadresser som ligger i sidens data
  const treff = html.matchAll(
    /https?:\/\/[^"'\\\s)]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s)]*)?/gi
  );
  for (const t of treff) {
    const u = avkod(t[0]);
    if (/(avatar|logo|icon|favicon|sprite|placeholder|banner|badge)/i.test(u)) continue;
    if (bilder.size >= 8) break;
    bilder.add(u);
  }

  return { tittel: tittel || 'Ny modell', beskrivelse, bilder: [...bilder].slice(0, 6) };
}

/** Lar AI skrive en norsk beskrivelse ut fra det vi fant. */
async function skrivMedAi(
  apiKey: string,
  modell: string,
  data: Skrap,
  url: string
): Promise<{
  navn?: string;
  kort?: string;
  full?: string;
  kategori?: string;
  vekt?: number;
} | null> {
  const svar = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modell || 'gpt-4o-mini',
      temperature: 0.6,
      max_tokens: 600,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Du skriver produkttekster på norsk bokmål for PrintFiksEB, en elevbedrift på ungdomsskolen som selger 3D-printede ting. Tonen er enkel, vennlig og konkret – ingen salgsfloskler, ingen utropstegn. Svar kun med JSON.',
        },
        {
          role: 'user',
          content: `Her er informasjon om en 3D-modell hentet fra ${url}:

Tittel: ${data.tittel}
Beskrivelse: ${data.beskrivelse.slice(0, 1500)}

Lag JSON med disse feltene:
- "navn": kort norsk produktnavn, maks 4 ord
- "kort": én til to setninger som beskriver hva det er (maks 200 tegn)
- "full": 2-3 korte avsnitt om hva den brukes til og hvorfor den er nyttig, skilt med tomme linjer. Ikke nevn hvor modellen er hentet fra.
- "kategori": ett ord, f.eks. Kontor, Kjøkken, Gaver, Oppbevaring, Bil, Verktøy
- "vekt": anslått vekt i gram som et tall (bare tallet)`,
        },
      ],
    }),
  });

  if (!svar.ok) return null;
  const json = await svar.json();
  const innhold = json?.choices?.[0]?.message?.content;
  if (!innhold) return null;
  try {
    return JSON.parse(innhold);
  } catch {
    return null;
  }
}

/** Laster ned et bilde og legger det i Supabase Storage. */
async function lastOppBilde(
  service: SupabaseClient,
  url: string
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PrintFiksEB/1.0)' },
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

export async function POST(request: Request) {
  const sjekk = await krevInnlogget(request);
  if (sjekk.feil) return sjekk.feil;
  const service = sjekk.service;

  let body: { url?: string; pris?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig forespørsel.' }, { status: 400 });
  }

  const url = (body.url || '').trim();
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'Lim inn en hel lenke som starter med https://' }, { status: 400 });
  }

  // 1) Hent siden
  let html = '';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept-Language': 'nb-NO,nb;q=0.9,en;q=0.8',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Fikk ikke hentet siden (feilkode ${res.status}). Sjekk at lenken er riktig.` },
        { status: 400 }
      );
    }
    html = await res.text();
  } catch {
    return NextResponse.json(
      { error: 'Klarte ikke å hente siden. Sjekk lenken, eller prøv igjen om litt.' },
      { status: 400 }
    );
  }

  const data = skrap(html, url);

  // 2) La AI skrive teksten hvis nøkkelen er lagt inn
  const apiKey = await hentHemmelighet(service, 'openai_api_key');
  let ai: Awaited<ReturnType<typeof skrivMedAi>> = null;
  let aiFeil = '';

  if (apiKey) {
    const { data: modellRad } = await service
      .from('settings')
      .select('value')
      .eq('key', 'ai_modell')
      .maybeSingle();
    try {
      ai = await skrivMedAi(apiKey, modellRad?.value || 'gpt-4o-mini', data, url);
      if (!ai) aiFeil = 'AI-en svarte ikke. Teksten er hentet rett fra siden i stedet.';
    } catch {
      aiFeil = 'Fikk ikke kontakt med AI-en. Teksten er hentet rett fra siden i stedet.';
    }
  } else {
    aiFeil = 'Ingen API-nøkkel er lagt inn, så teksten er hentet rett fra siden.';
  }

  // 3) Last ned bildene
  const lastedeBilder: string[] = [];
  for (const b of data.bilder) {
    const opplastet = await lastOppBilde(service, b);
    if (opplastet) lastedeBilder.push(opplastet);
    if (lastedeBilder.length >= 5) break;
  }

  // 4) Pris: bruk det som ble oppgitt, ellers regn ut fra anslått vekt
  let pris = Number(body.pris) || 0;
  if (!pris) {
    const { data: rader } = await service
      .from('settings')
      .select('key, value')
      .in('key', ['pris_startpris', 'pris_startpris_pa']);
    const start = Number(rader?.find((r) => r.key === 'pris_startpris')?.value ?? 100);
    const { data: mat } = await service
      .from('materials')
      .select('price_per_gram')
      .eq('active', true)
      .order('sort')
      .limit(1)
      .maybeSingle();
    const perGram = Number(mat?.price_per_gram ?? 0.8);
    const vekt = Number(ai?.vekt) || 40;
    pris = Math.max(29, Math.round((start * 0.5 + vekt * perGram) / 5) * 5);
  }

  // 5) Lagre modellen (skjult til dere har sett over den)
  const ny = {
    name: (ai?.navn || data.tittel).slice(0, 80),
    description: (ai?.kort || data.beskrivelse).slice(0, 400),
    details: ai?.full || data.beskrivelse,
    price: pris,
    image_url: lastedeBilder[0] ?? '',
    images: lastedeBilder.slice(1),
    weight_g: ai?.vekt ? Math.round(Number(ai.vekt)) : null,
    category: ai?.kategori || '',
    source_url: url,
    active: false,
    sort: 100,
  };

  const { data: produkt, error } = await service.from('products').insert(ny).select().single();
  if (error || !produkt) {
    return NextResponse.json({ error: 'Klarte ikke å lagre modellen i galleriet.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    produkt,
    antallBilder: lastedeBilder.length,
    brukteAi: !!ai,
    merknad: aiFeil,
  });
}
