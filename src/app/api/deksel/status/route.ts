import { NextResponse } from 'next/server';
import { getSiteData } from '@/lib/data';
import { hentDekselModellerMedFeil, hentDekselProdukt } from '@/lib/deksel/server';

export const dynamic = 'force-dynamic';

/** Hva ser kundene av dekselet akkurat nå? Brukes av «Deksler» i admin. */
export async function GET() {
  const site = await getSiteData();
  const [m, produkt] = await Promise.all([hentDekselModellerMedFeil(), hentDekselProdukt(site.settings)]);
  return NextResponse.json({
    versjon: 'deksel-2026-10-14d',
    modeller: m.modeller.map((x) => x.navn),
    modellFeil: m.feil,
    utenAnalyse: m.uten,
    produktFinnes: !!produkt,
    produktPublisert: site.products.some((p) => p.spesial === 'deksel'),
  });
}
