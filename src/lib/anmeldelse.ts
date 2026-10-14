import { randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Hver bestilling får en hemmelig lenke kunden kan bruke til å skrive en
 * anmeldelse. Uten lenken kommer ingen inn – så ingen kan spamme skjemaet.
 */
export async function anmeldelsesLenke(
  service: SupabaseClient,
  ordreId: string,
  nettside: string
): Promise<string | null> {
  const { data, error } = await service
    .from('orders')
    .select('anmeldelse_token')
    .eq('id', ordreId)
    .maybeSingle();
  if (error || !data) return null; // kolonnen finnes ikke ennå (SQL ikke kjørt)
  let token = (data as { anmeldelse_token: string | null }).anmeldelse_token;
  if (!token) {
    token = randomBytes(15).toString('base64url');
    const { error: e2 } = await service.from('orders').update({ anmeldelse_token: token }).eq('id', ordreId);
    if (e2) return null;
  }
  return `${nettside.replace(/\/$/, '')}/anmeld/${token}`;
}

/** «Ola Nordmann» → «Ola N.» */
export function kortNavn(navn: string): string {
  const deler = navn.trim().split(/\s+/).filter(Boolean);
  if (!deler.length) return '';
  if (deler.length === 1) return deler[0];
  return `${deler[0]} ${deler[deler.length - 1][0].toUpperCase()}.`;
}
