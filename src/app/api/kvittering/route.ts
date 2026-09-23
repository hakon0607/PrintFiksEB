import { NextResponse } from 'next/server';
import { krevInnlogget } from '@/lib/server-auth';
import { sendForOrdre } from '@/lib/ordre-epost';

export const dynamic = 'force-dynamic';

/**
 * Sender kvittering til kunden – og varsel til oss – for en bestilling
 * vi har opprettet selv i admin.
 */
export async function POST(request: Request) {
  const okt = await krevInnlogget(request);
  if (okt.feil) return okt.feil;

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    tilKunde?: boolean;
    tilOss?: boolean;
    mal?: 'mottatt' | 'ferdig';
  };
  if (!body.id) return NextResponse.json({ feil: 'Mangler bestilling.' }, { status: 400 });

  const utfall = await sendForOrdre(okt.service, body.id, {
    origin: new URL(request.url).origin,
    tilKunde: body.tilKunde !== false,
    tilOss: body.tilOss !== false,
    mal: body.mal === 'ferdig' ? 'ferdig' : 'mottatt',
  });

  if (!utfall.status && utfall.feil) {
    return NextResponse.json({ feil: utfall.feil }, { status: 400 });
  }
  if (!utfall.ok) {
    return NextResponse.json(
      { feil: utfall.feil ?? 'Klarte ikke å sende.', status: utfall.status },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, status: utfall.status, mottakere: utfall.mottakere });
}
