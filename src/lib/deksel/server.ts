import { getPublicServerClient } from '@/lib/supabase/server';
import type { DekselModell } from '@/components/DekselGenerator';

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
