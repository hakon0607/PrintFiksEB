import { NextResponse } from 'next/server';
import { krevInnlogget } from '@/lib/server-auth';
import { finnMottakere, gyldigEpost, lesAdresser, sendEpost, testEpost } from '@/lib/epost';

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
  const avsender = s.epost_avsender || 'PrintFiksEB <onboarding@resend.dev>';
  const nokkel = Boolean(process.env.RESEND_API_KEY);

  // onboarding@resend.dev kan bare sende til adressen Resend-kontoen er laget med.
  const testavsender = /resend\.dev/i.test(avsender);

  return NextResponse.json({
    nokkel,
    avsender,
    testavsender,
    mottakere: mottakere.adresser,
    fraAnsatte: mottakere.fraAnsatte,
    fraInnstilling: mottakere.fraInnstilling,
    reserveBrukt: mottakere.reserveBrukt,
    manglerKolonne: mottakere.manglerKolonne,
    bedrift: s.bedrift_navn || 'PrintFiksEB',
  });
}

/** Sender en test-e-post, og forteller nøyaktig hva som gikk galt hvis den ikke kom fram. */
export async function POST(request: Request) {
  const okt = await krevInnlogget(request);
  if (okt.feil) return okt.feil;

  const body = (await request.json().catch(() => ({}))) as { til?: string };
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
