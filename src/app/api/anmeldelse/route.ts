import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/server';
import { kortNavn } from '@/lib/anmeldelse';
import { finnMottakere, sendEnkeltvis } from '@/lib/epost';

export const dynamic = 'force-dynamic';

/**
 * Kunden sender anmeldelse via den hemmelige lenken. Den lagres SKJULT –
 * dere slår den på i admin før den kommer på nettsiden.
 */
export async function POST(request: Request) {
  const service = getServiceClient();
  if (!service) return NextResponse.json({ feil: 'Serveren er ikke satt opp.' }, { status: 500 });

  const b = (await request.json().catch(() => ({}))) as {
    token?: unknown; stjerner?: unknown; tekst?: unknown; navn?: unknown; visNavn?: unknown;
  };
  const token = String(b.token ?? '').slice(0, 64);
  const stjerner = Math.round(Number(b.stjerner));
  const tekst = String(b.tekst ?? '').trim().slice(0, 600);
  const visNavn = b.visNavn !== false;
  if (!/^[\w-]{10,64}$/.test(token)) return NextResponse.json({ feil: 'Ugyldig lenke.' }, { status: 400 });
  if (!(stjerner >= 1 && stjerner <= 5)) return NextResponse.json({ feil: 'Velg 1–5 stjerner.' }, { status: 400 });
  if (tekst.length < 5) return NextResponse.json({ feil: 'Skriv noen ord om hvordan det var.' }, { status: 400 });

  const { data: ordre } = await service
    .from('orders')
    .select('id,ordrenr,kunde')
    .eq('anmeldelse_token', token)
    .maybeSingle();
  if (!ordre) return NextResponse.json({ feil: 'Fant ikke bestillingen. Bruk lenken fra e-posten.' }, { status: 404 });
  const o = ordre as { id: string; ordrenr: string | null; kunde: string | null };

  const { data: varer } = await service.from('order_items').select('name').eq('order_id', o.id).order('sort').limit(1);
  const forste = String((varer as { name: string }[] | null)?.[0]?.name ?? '').split(' – ')[0];
  const navn = visNavn ? (String(b.navn ?? '').trim().slice(0, 40) || kortNavn(String(o.kunde ?? ''))) : 'Kunde';

  const rad = {
    name: navn || 'Kunde',
    place: forste ? `Kjøpte ${forste.toLowerCase()}` : '',
    quote: tekst,
    stars: stjerner,
    active: false,
    kilde: 'kunde',
    order_id: o.id,
  };

  const { data: finnes } = await service.from('reviews').select('id,active').eq('order_id', o.id).maybeSingle();
  if (finnes && (finnes as { active: boolean }).active) {
    return NextResponse.json({ feil: 'Anmeldelsen din er allerede publisert. Takk!' }, { status: 409 });
  }
  const { error } = finnes
    ? await service.from('reviews').update(rad).eq('id', (finnes as { id: string }).id)
    : await service.from('reviews').insert({ ...rad, sort: 1 });
  if (error) {
    console.error('[anmeldelse]', error.message);
    return NextResponse.json({ feil: 'Klarte ikke å lagre. Prøv igjen om litt.' }, { status: 500 });
  }

  // si fra til dere – feiler det, er det ikke kritisk
  try {
    const { data: s } = await service.from('settings').select('key,value').in('key', ['epost_bedrift', 'epost_avsender']);
    const inn: Record<string, string> = {};
    for (const r of ((s as { key: string; value: string }[]) ?? [])) inn[r.key] = r.value;
    const mottakere = await finnMottakere(service, inn.epost_bedrift ?? '');
    if (mottakere.adresser.length) {
      const st = '★'.repeat(stjerner) + '☆'.repeat(5 - stjerner);
      await sendEnkeltvis({
        til: mottakere.adresser,
        emne: `Ny anmeldelse ${st} – ${rad.name}`,
        tekst: `${rad.name} ga ${stjerner} av 5 stjerner${o.ordrenr ? ` (bestilling #${o.ordrenr})` : ''}:\n\n«${tekst}»\n\nDen er skjult til dere slår den på under Anmeldelser i admin.`,
        html: `<p style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#14171C;"><strong>${esc(rad.name)}</strong> ga <span style="color:#F5B301;font-size:18px;">${st}</span>${o.ordrenr ? ` (bestilling #${esc(o.ordrenr)})` : ''}</p><blockquote style="font-family:sans-serif;font-size:15px;line-height:1.6;margin:0;padding:12px 16px;background:#F6F8FC;border-radius:12px;">${esc(tekst)}</blockquote><p style="font-family:sans-serif;font-size:13px;color:#697285;">Den er skjult til dere slår den på under Anmeldelser i admin.</p>`,
        avsender: inn.epost_avsender || 'PrintFiksEB <post@printfiks.org>',
      });
    }
  } catch {
    /* ikke kritisk */
  }

  return NextResponse.json({ ok: true });
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
