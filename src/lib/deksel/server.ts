import { getPublicServerClient } from '@/lib/supabase/server';
import type { DekselModell } from '@/components/DekselGenerator';
import type { Product } from '@/lib/types';
import { DEKSEL_KODE, dekselFraPris } from './produkt';

/** Mobilene kundene kan velge i dekselgeneratoren (bare de synlige). */
export async function hentDekselModeller(): Promise<DekselModell[]> {
  const sb = getPublicServerClient();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from('deksel_modeller')
      .select('id,navn,analyse:bakside')
      .eq('aktiv', true)
      .order('sort')
      .order('navn');
    if (error || !data) return [];
    return (data as unknown as DekselModell[]).filter((m) => m.analyse && Array.isArray(m.analyse.trygg));
  } catch {
    return [];
  }
}

/**
 * Dekselproduktet rett fra databasen – brukes hvis det ikke er publisert
 * ennå, så dekselet virker med en gang SQL-en er kjørt.
 */
export async function hentDekselProdukt(settings: Record<string, string>): Promise<Product | null> {
  const sb = getPublicServerClient();
  if (!sb) return null;
  try {
    const { data } = await sb
      .from('products')
      .select('id,code,name,description,details,tagline,highlights,price,image_url,images,material,weight_g,category,featured,active,sort,created_at')
      .eq('code', DEKSEL_KODE)
      .eq('active', true)
      .maybeSingle();
    if (!data) return null;
    return {
      ...(data as unknown as Product),
      spesial: 'deksel',
      price: dekselFraPris(
        Number(settings.deksel_grunnpris ?? 59) || 59,
        Number(settings.deksel_pris_per_farge ?? 10) || 0
      ),
    };
  } catch {
    return null;
  }
}
