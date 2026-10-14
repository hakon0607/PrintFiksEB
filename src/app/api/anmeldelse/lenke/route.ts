import { NextResponse } from 'next/server';
import { krevInnlogget } from '@/lib/server-auth';
import { anmeldelsesLenke } from '@/lib/anmeldelse';

export const dynamic = 'force-dynamic';

/** Admin: hent (eller lag) anmeldelseslenken til en bestilling, f.eks. for å sende på SMS. */
export async function POST(request: Request) {
  const okt = await krevInnlogget(request);
  if (okt.feil) return okt.feil;
  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ feil: 'Mangler bestilling.' }, { status: 400 });
  const { data } = await okt.service.from('settings').select('value').eq('key', 'nettside_url').maybeSingle();
  const nettside = (data as { value: string } | null)?.value || new URL(request.url).origin;
  const url = await anmeldelsesLenke(okt.service, id, nettside);
  if (!url) return NextResponse.json({ feil: 'Kjør supabase/anmeldelser-kunder.sql først.' }, { status: 500 });
  return NextResponse.json({ ok: true, url });
}
