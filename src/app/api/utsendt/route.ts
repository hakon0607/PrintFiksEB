import { NextResponse } from 'next/server';
import { krevInnlogget } from '@/lib/server-auth';
import { loggUtsendt, type Slag } from '@/lib/utsendt';

export const dynamic = 'force-dynamic';

const LOVLIGE: Slag[] = ['bekreftelse', 'ferdig', 'henting', 'varsel'];

/**
 * Skriver ned noe vi har sendt utenfor systemet – i praksis SMS-en om
 * at bestillingen er klar til henting. Den sendes fra telefonen vår,
 * så serveren må få vite at den gikk ut.
 */
export async function POST(request: Request) {
  const okt = await krevInnlogget(request);
  if (okt.feil) return okt.feil;

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    slag?: string;
    kanal?: string;
    til?: string;
    detalj?: string;
  };

  if (!body.id) return NextResponse.json({ feil: 'Mangler bestilling.' }, { status: 400 });
  const slag = LOVLIGE.find((s) => s === body.slag);
  if (!slag) return NextResponse.json({ feil: 'Ukjent type melding.' }, { status: 400 });

  await loggUtsendt(okt.service, [
    {
      orderId: body.id,
      slag,
      kanal: body.kanal === 'sms' ? 'sms' : 'epost',
      til: body.til,
      ok: true,
      detalj: body.detalj,
    },
  ]);

  return NextResponse.json({ ok: true });
}
