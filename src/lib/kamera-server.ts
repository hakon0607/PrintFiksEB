import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { KAMERA_SKJULT, KAMERA_TAG, tilOffentlig, type KameraOffentlig } from './kamera';

/**
 * Henter det offentlige om live-kameraet. Svarer databasen ikke (eller SQL-en
 * ikke er kjørt ennå), er fanen skjult.
 * Next mellomlagrer ellers fetch-kall (også POST) – her skal svaret alltid være ferskt.
 */
async function hent(): Promise<KameraOffentlig> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return KAMERA_SKJULT;
  try {
    const sb = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    });
    const { data, error } = await sb.rpc('kamera_offentlig');
    if (error || !data) return KAMERA_SKJULT;
    return tilOffentlig(data, url);
  } catch {
    return KAMERA_SKJULT;
  }
}

/** Til menyen: mellomlagres i 20 sekunder (og tømmes straks når noe lagres i admin). */
export const hentKameraMeny = unstable_cache(hent, ['kamera-offentlig'], { revalidate: 20, tags: [KAMERA_TAG] });

/** Til selve live-siden: alltid ferskt. */
export const hentKameraFersk = hent;
