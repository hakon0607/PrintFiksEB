import { NextResponse } from 'next/server';
import { getSiteData } from '@/lib/data';
import { hentDekselModeller, hentDekselProdukt } from '@/lib/deksel/server';

export const dynamic = 'force-dynamic';

/** Hva ser kundene av dekselet akkurat nå? Brukes av «Deksler» i admin. */
export async function GET() {
  const site = await getSiteData();
  const [modeller, produkt] = await Promise.all([hentDekselModeller(), hentDekselProdukt(site.settings)]);
  return NextResponse.json({
    versjon: 'deksel-2026-10-14b',
    modeller: modeller.map((m) => m.navn),
    produktFinnes: !!produkt,
    produktPublisert: site.products.some((p) => p.spesial === 'deksel'),
  });
}
