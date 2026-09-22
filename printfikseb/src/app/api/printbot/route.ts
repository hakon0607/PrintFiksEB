import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { krevInnlogget, hentHemmelighet } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

type Melding = { rolle: 'bruker' | 'bot'; tekst: string };

type Forslag = {
  id?: string;
  hva?: string;
  type?: string;
  nokkel?: string;
  ny_verdi?: string | number | boolean;
  tittel?: string;
  ansvarlig_navn?: string | null;
  frist?: string | null;
  hastegrad?: string;
  materiale_id?: string;
  ny_pris_per_gram?: number;
  sporsmal?: string;
  svar_tekst?: string;
  produkt_id?: string;
  felt?: string;
  for_verdi?: string;
  ansvarlig_id?: string | null;
  kunde?: string;
  hva_bestilt?: string;
  bestilling_pris?: number;
  bestilling_telefon?: string;
  bestilling_levering?: string;
  bestilling_frist?: string | null;
};

const SIDER = `
/admin                 Oversikt – tall og snarveier
/admin/bestillinger    Bestillinger – bestillinger som er kommet inn, status, hvem som gjør hva, betaling
/admin/oppgaver        Oppgaver – hva som skal gjøres, hvem som gjør det, frister
/admin/priser          Priser – pris per gram, startpris, tillegg, levering, størrelser
/admin/galleri         Galleri – ferdige modeller med bilder, og «Finpuss med AI»
/admin/eksempler       Hva vi kan fikse – eksemplene på 3D-printing-siden
/admin/tekster         Tekster – overskrifter og tekster på nettsiden
/admin/sporsmal        Spørsmål og svar – FAQ på «Om oss»
/admin/ansatte         Ansatte – hvem som vises på nettsiden og hvem som kan logge inn
/admin/profil          Min profil – eget navn, bilde og passord
/admin/innstillinger   Kontakt og levering – telefon, Vipps, åpningstider, leveringstid
`.trim();

async function hentKontekst(service: SupabaseClient) {
  const [settings, materials, products, team, faq, tasks, orders] = await Promise.all([
    service.from('settings').select('key,value,label,gruppe').order('gruppe'),
    service.from('materials').select('id,name,price_per_gram,active').order('sort'),
    service.from('products').select('id,name,price,active,code').order('sort').limit(60),
    service.from('team_members').select('id,name').order('sort'),
    service.from('faq').select('id,question').order('sort'),
    service.from('tasks').select('id,title,done').eq('done', false).limit(30),
    service
      .from('orders')
      .select('id,kunde,hva,status,pris,betalt')
      .in('status', ['ny', 'tilbud', 'godkjent', 'produksjon', 'ferdig'])
      .limit(30),
  ]);

  return {
    innstillinger: settings.data ?? [],
    materialer: materials.data ?? [],
    modeller: products.data ?? [],
    ansatte: team.data ?? [],
    sporsmal: faq.data ?? [],
    apneOppgaver: tasks.data ?? [],
    bestillingerPaaGang: orders.data ?? [],
  };
}

export async function POST(request: Request) {
  const sjekk = await krevInnlogget(request);
  if (sjekk.feil) return sjekk.feil;
  const service = sjekk.service;

  let body: { meldinger?: Melding[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig forespørsel.' }, { status: 400 });
  }

  const meldinger = (body.meldinger ?? []).slice(-12);
  if (!meldinger.length) {
    return NextResponse.json({ error: 'Skriv noe først.' }, { status: 400 });
  }

  const apiKey = await hentHemmelighet(service, 'openai_api_key');
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'PrintBot trenger en AI-nøkkel. Eieren legger den inn øverst på Galleri-siden.',
      },
      { status: 400 }
    );
  }

  const kontekst = await hentKontekst(service);
  const { data: modellRad } = await service
    .from('settings')
    .select('value')
    .eq('key', 'ai_modell')
    .maybeSingle();

  const system = `Du er PrintBot, hjelperen i adminpanelet til PrintFiksEB – en elevbedrift på Skranevatnet skole som 3D-printer, reparerer og designer ting.

Du snakker med 10.-klassinger som driver bedriften. Skriv kort, vennlig og på norsk bokmål. Ingen fagord, ingen engelsk, ingen emojier. Er du usikker, si det.

SLIK ER ADMINPANELET BYGD OPP:
${SIDER}

VIKTIG OM ENDRINGER:
Du gjør ALDRI en endring selv, og du spør alltid først.

Den du snakker med bestemmer helt selv. De ser nøyaktig hva som vil skje, og må trykke «Ja, gjør det». Ingen andre er involvert – du skal aldri be dem spørre en sjef eller vente på noen.

Reglene dine:
- Foreslå bare det de faktisk har bedt om. Aldri noe i tillegg, aldri «mens jeg først er i gang».
- Er du i tvil om hva de mener, hvilken ting de sikter til, eller hvilken verdi de vil ha – still et spørsmål i "svar" og la "forslag" stå tom. Det er alltid bedre å spørre enn å gjette.
- Skriv "hva" som et spørsmål: «Skal jeg sette startprisen til 79 kr?»
- Endrer du noe som påvirker prisen kundene ser, si det tydelig i svaret.

Alt som endres må publiseres etterpå med «Publiser endringene» øverst i adminpanelet før kundene ser det. Minn om det når du har foreslått noe.

DETTE ER SITUASJONEN NÅ:
Innstillinger: ${JSON.stringify(kontekst.innstillinger)}
Materialer: ${JSON.stringify(kontekst.materialer)}
Modeller i galleriet: ${JSON.stringify(kontekst.modeller)}
Ansatte: ${JSON.stringify(kontekst.ansatte)}
Spørsmål og svar: ${JSON.stringify(kontekst.sporsmal)}
Åpne oppgaver: ${JSON.stringify(kontekst.apneOppgaver)}
Bestillinger på gang: ${JSON.stringify(kontekst.bestillingerPaaGang)}

SVAR ALLTID MED JSON:
{
  "svar": "svaret ditt til brukeren, kort og i klartekst. Har du forslag, spør om de vil at du skal gjøre det.",
  "naviger": "/admin/priser eller null hvis ingen side er relevant",
  "forslag": []
}

I "forslag" kan du legge inn endringer. Hver av disse typene finnes:

{"type":"innstilling","hva":"Skal jeg sette startprisen til 79 kr?","nokkel":"pris_startpris","ny_verdi":"79"}
{"type":"materiale","hva":"Skal jeg sette PETG til 1,20 kr per gram?","materiale_id":"<id>","ny_pris_per_gram":1.2}
{"type":"oppgave","hva":"Skal jeg lage oppgaven «Ta bilder av nøkkelringene»?","tittel":"Ta bilder av nøkkelringene","ansvarlig_navn":"Håkon","frist":"2026-10-01","hastegrad":"normal"}
{"type":"faq","hva":"Skal jeg legge til dette spørsmålet?","sporsmal":"Leverer dere til Fana?","svar_tekst":"Ja, mot et lite tillegg."}
{"type":"bestilling","hva":"Skal jeg føre opp bestillingen fra Emma?","kunde":"Emma","hva_bestilt":"Saksholder i svart PLA, 2 stk","bestilling_pris":149,"bestilling_telefon":"","bestilling_levering":"Henting","bestilling_frist":null}
{"type":"produkt","hva":"Skal jeg sette prisen på Nøkkelholder til 129 kr?","produkt_id":"<id>","felt":"price","ny_verdi":129}

Regler for forslag:
- Bruk ekte id-er fra listene over. Finn du ikke id-en, ikke foreslå endringen – spør i stedet.
- "felt" på produkt kan bare være "price", "active" eller "featured".
- "bestilling_levering" er "Henting" eller "Hjemlevering".
- "hastegrad" er "lav", "normal" eller "hoy".
- "frist" er på formen ÅÅÅÅ-MM-DD, eller null.
- Er spørsmålet bare et spørsmål, la "forslag" være tom liste.
- Maks 5 forslag om gangen.`;

  let svarRes: Response;
  try {
    svarRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(35000),
      body: JSON.stringify({
        model: modellRad?.value || 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 900,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          ...meldinger.map((m) => ({
            role: m.rolle === 'bruker' ? ('user' as const) : ('assistant' as const),
            content: m.tekst,
          })),
        ],
      }),
    });
  } catch {
    return NextResponse.json(
      { error: 'Fikk ikke kontakt med AI-en. Prøv igjen om litt.' },
      { status: 502 }
    );
  }

  if (!svarRes.ok) {
    return NextResponse.json(
      {
        error:
          svarRes.status === 401
            ? 'AI-nøkkelen ble ikke godtatt. Eieren må legge inn en ny.'
            : svarRes.status === 429
              ? 'AI-en er opptatt eller tom for kvote. Prøv igjen om litt.'
              : 'AI-en svarte ikke som forventet.',
      },
      { status: 502 }
    );
  }

  let ut: { svar?: string; naviger?: string | null; forslag?: Forslag[] };
  try {
    const json = await svarRes.json();
    ut = JSON.parse(json?.choices?.[0]?.message?.content ?? '{}');
  } catch {
    return NextResponse.json({ error: 'Klarte ikke å lese svaret fra AI-en.' }, { status: 502 });
  }

  // Vi finner «før»-verdien selv, så brukeren ser det som faktisk står nå
  const forslag = (ut.forslag ?? []).slice(0, 5).map((f, i) => {
    const beriket: Forslag = { ...f, id: `${Date.now()}-${i}` };

    if (f.type === 'innstilling') {
      beriket.for_verdi =
        kontekst.innstillinger.find((r) => r.key === f.nokkel)?.value ?? '(finnes ikke)';
    }
    if (f.type === 'materiale') {
      const m = kontekst.materialer.find((r) => r.id === f.materiale_id);
      beriket.for_verdi = m ? `${m.price_per_gram} kr/g` : '(finnes ikke)';
    }
    if (f.type === 'produkt') {
      const p = kontekst.modeller.find((r) => r.id === f.produkt_id);
      beriket.for_verdi = p ? String(p[(f.felt as 'price') ?? 'price'] ?? '') : '(finnes ikke)';
    }
    if (f.type === 'oppgave' && f.ansvarlig_navn) {
      beriket.ansvarlig_id =
        kontekst.ansatte.find(
          (a) => a.name?.toLowerCase() === String(f.ansvarlig_navn).toLowerCase()
        )?.id ?? null;
    }

    return beriket;
  });

  // Foreslag uten gyldig mål slipper ikke gjennom
  const gyldige = forslag.filter((f) => {
    if (f.type === 'innstilling') return !!f.nokkel && f.for_verdi !== '(finnes ikke)';
    if (f.type === 'materiale') return !!f.materiale_id && f.for_verdi !== '(finnes ikke)';
    if (f.type === 'produkt')
      return (
        !!f.produkt_id &&
        ['price', 'active', 'featured'].includes(String(f.felt)) &&
        f.for_verdi !== '(finnes ikke)'
      );
    if (f.type === 'oppgave') return !!f.tittel;
    if (f.type === 'faq') return !!f.sporsmal;
    if (f.type === 'bestilling') return !!f.kunde && !!f.hva_bestilt;
    return false;
  });

  return NextResponse.json({
    ok: true,
    svar: ut.svar || 'Her er det jeg fant ut.',
    naviger: typeof ut.naviger === 'string' && ut.naviger.startsWith('/admin') ? ut.naviger : null,
    forslag: gyldige,
  });
}
