import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import type { DekselModell } from '@/components/DekselGenerator';
import type { Product } from '@/lib/types';
import { DEKSEL_KODE, dekselFraPris } from './produkt';

/**
 * Egen leseklient som ALLTID henter ferske data. Next/Vercel lagrer ellers
 * svar fra fetch() i en cache som overlever nye deployer – derfor viste
 * nettsiden fortsatt «ingen mobiler» selv om de lå i Supabase.
 */
function ferskKlient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });
}

/** Mobilene kundene kan velge i dekselgeneratoren (bare de synlige). */
export async function hentDekselModeller(): Promise<DekselModell[]> {
  return (await hentDekselModellerMedFeil()).modeller;
}

/** Som over, men forteller også hvorfor det eventuelt ikke gikk (for statussjekken i admin). */
export async function hentDekselModellerMedFeil(): Promise<{ modeller: DekselModell[]; feil: string | null; uten: string[] }> {
  noStore();
  const sb = ferskKlient();
  if (!sb) return { modeller: [], feil: 'Nettsiden mangler Supabase-nøklene (miljøvariabler i Vercel).', uten: [] };
  try {
    const { data, error } = await sb
      .from('deksel_modeller')
      .select('id,navn,fil_url,fil_navn,analyse:bakside')
      .eq('aktiv', true)
      .order('sort')
      .order('navn');
    if (error) {
      console.error('[deksel] klarte ikke å hente mobilene:', error.message);
      return { modeller: [], feil: error.message, uten: [] };
    }
    const alle = (data ?? []) as unknown as DekselModell[];
    const ok = alle.filter((m) => m.analyse && Array.isArray(m.analyse.trygg));
    return { modeller: ok, feil: null, uten: alle.filter((m) => !ok.includes(m)).map((m) => m.navn) };
  } catch (e) {
    return { modeller: [], feil: e instanceof Error ? e.message : 'Ukjent feil', uten: [] };
  }
}

/**
 * Dekselproduktet rett fra databasen – brukes hvis det ikke er publisert
 * ennå, så dekselet virker med en gang SQL-en er kjørt.
 */
export async function hentDekselProdukt(settings: Record<string, string>): Promise<Product | null> {
  noStore();
  const sb = ferskKlient();
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
