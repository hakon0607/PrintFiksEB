import { NextResponse } from 'next/server';
import { krevInnlogget } from '@/lib/server-auth';
import { getServiceClient } from '@/lib/supabase/server';
import { kundeEpost, sendEpost, type EpostLinje } from '@/lib/epost';

export const dynamic = 'force-dynamic';

/** Sender kvitteringen på nytt til kunden – brukes når vi oppretter en bestilling selv. */
export async function POST(request: Request) {
  const okt = await krevInnlogget(request);
  if (okt.feil) return okt.feil;

  const service = getServiceClient();
  if (!service) return NextResponse.json({ feil: 'Databasen mangler.' }, { status: 500 });

  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ feil: 'Mangler bestilling.' }, { status: 400 });

  const { data: ordre } = await service.from('orders').select('*').eq('id', id).maybeSingle();
  if (!ordre) return NextResponse.json({ feil: 'Fant ikke bestillingen.' }, { status: 404 });

  const o = ordre as Record<string, unknown>;
  const epost = String(o.epost ?? '').trim();
  if (!epost) return NextResponse.json({ feil: 'Bestillingen mangler e-postadresse.' }, { status: 400 });

  const { data: varer } = await service
    .from('order_items')
    .select('*')
    .eq('order_id', id)
    .order('sort');

  const { data: innst } = await service
    .from('settings')
    .select('key,value')
    .in('key', [
      'bedrift_navn',
      'kontakt_telefon',
      'epost_avsender',
      'levering_dager_min',
      'levering_dager_maks',
      'nettside_url',
    ]);
  const s: Record<string, string> = {};
  for (const rad of ((innst as { key: string; value: string }[]) ?? [])) s[rad.key] = rad.value;

  const valuta = 'kr';
  const linjer: EpostLinje[] = ((varer as Record<string, unknown>[]) ?? []).map((v) => ({
    navn: String(v.name ?? 'Uten navn'),
    antall: Number(v.qty ?? 1),
    pris: `${Math.round(Number(v.qty ?? 1) * Number(v.unit_price ?? 0))} ${valuta}`,
  }));
  if (linjer.length === 0) {
    linjer.push({ navn: String(o.hva ?? 'Bestilling'), antall: 1, pris: 'Etter avtale' });
  }

  const brev = kundeEpost({
    ordrenr: String(o.ordrenr ?? ''),
    kunde: String(o.kunde ?? ''),
    telefon: String(o.telefon ?? ''),
    epost,
    adresse: String(o.adresse ?? ''),
    levering: String(o.levering ?? 'Henting'),
    betaling: String(o.betalingsmate ?? 'Vipps'),
    kommentar: String(o.notat ?? ''),
    linjer,
    sum: Number(o.pris ?? 0) > 0 ? `${Math.round(Number(o.pris))} ${valuta}` : 'Etter avtale',
    bedrift: s.bedrift_navn || 'PrintFiksEB',
    bedriftTelefon: s.kontakt_telefon || '41381608',
    nettside: s.nettside_url || new URL(request.url).origin,
    leveringstid: `${s.levering_dager_min || '2'}–${s.levering_dager_maks || '4'} virkedager`,
  });

  const res = await sendEpost({
    til: [epost],
    emne: brev.emne,
    html: brev.html,
    tekst: brev.tekst,
    avsender: s.epost_avsender || 'PrintFiksEB <onboarding@resend.dev>',
  });

  if (!res.ok) return NextResponse.json({ feil: res.feil ?? 'Klarte ikke å sende.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
