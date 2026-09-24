import { NextResponse } from 'next/server';
import { krevInnlogget } from '@/lib/server-auth';
import {
  avsendervei,
  finnMottakere,
  gyldigEpost,
  lesAdresser,
  sendEpost,
  smtpOppsett,
  testEpost,
} from '@/lib/epost';
import { sendForOrdre } from '@/lib/ordre-epost';

export const dynamic = 'force-dynamic';

async function hentInnstillinger(service: Awaited<ReturnType<typeof krevInnlogget>>['service']) {
  const { data } = await service!
    .from('settings')
    .select('key,value')
    .in('key', ['bedrift_navn', 'epost_avsender', 'epost_bedrift']);
  const s: Record<string, string> = {};
  for (const rad of ((data as { key: string; value: string }[]) ?? [])) s[rad.key] = rad.value;
  return s;
}

/** Status på e-postoppsettet – hva mangler? */
export async function GET(request: Request) {
  const okt = await krevInnlogget(request);
  if (okt.feil) return okt.feil;

  const s = await hentInnstillinger(okt.service);
  const mottakere = await finnMottakere(okt.service, s.epost_bedrift ?? '');
  const vei = avsendervei();
  const smtp = smtpOppsett();
  const avsender = smtp
    ? smtp.bruker
    : s.epost_avsender || 'PrintFiksEB <onboarding@resend.dev>';
  const nokkel = vei !== 'ingen';

  // Resend sin testadresse kan bare sende til kontoens egen adresse.
  const testavsender = vei === 'resend' && /resend\.dev/i.test(avsender);

  const { data: siste } = await okt.service
    .from('orders')
    .select('id,ordrenr,kunde,created_at,kilde,epost,epost_status')
    .order('created_at', { ascending: false })
    .limit(8);

  return NextResponse.json({
    nokkel,
    vei,
    smtpVert: smtp?.vert ?? '',
    avsender,
    testavsender,
    mottakere: mottakere.adresser,
    fraAnsatte: mottakere.fraAnsatte,
    fraInnstilling: mottakere.fraInnstilling,
    reserveBrukt: mottakere.reserveBrukt,
    manglerKolonne: mottakere.manglerKolonne,
    bedrift: s.bedrift_navn || 'PrintFiksEB',
    siste: siste ?? [],
  });
}

/** Sender en test-e-post, og forteller nøyaktig hva som gikk galt hvis den ikke kom fram. */
export async function POST(request: Request) {
  const okt = await krevInnlogget(request);
  if (okt.feil) return okt.feil;

  const body = (await request.json().catch(() => ({}))) as { til?: string; ordreId?: string };

  // Send varselet for en konkret bestilling på nytt.
  if (body.ordreId) {
    const utfall = await sendForOrdre(okt.service, body.ordreId, {
      origin: new URL(request.url).origin,
      tilKunde: false,
      tilOss: true,
    });
    return NextResponse.json({
      ok: utfall.varselOk,
      til: utfall.mottakere,
      feil: utfall.varselOk ? undefined : utfall.feil ?? 'Klarte ikke å sende varselet.',
    });
  }

  const s = await hentInnstillinger(okt.service);
  const avsender = s.epost_avsender || 'PrintFiksEB <onboarding@resend.dev>';
  const bedrift = s.bedrift_navn || 'PrintFiksEB';

  let til = lesAdresser(body.til ?? '');
  if (til.length === 0) {
    const m = await finnMottakere(okt.service, s.epost_bedrift ?? '');
    til = m.adresser;
  }

  if (til.length === 0) {
    return NextResponse.json(
      { feil: 'Ingen adresse å sende til. Skriv inn en e-postadresse, eller legg den inn under Ansatte.' },
      { status: 400 }
    );
  }
  if (til.some((t) => !gyldigEpost(t))) {
    return NextResponse.json({ feil: 'En av adressene ser ikke riktig ut.' }, { status: 400 });
  }

  const post = testEpost(bedrift);
  const res = await sendEpost({ til, emne: post.emne, html: post.html, tekst: post.tekst, avsender });

  if (!res.ok) {
    console.error('[epost-test] gikk ikke ut', { til, avsender, feil: res.feil });
    return NextResponse.json({ ok: false, til, feil: res.feil ?? 'Ukjent feil' });
  }
  return NextResponse.json({ ok: true, til });
}
