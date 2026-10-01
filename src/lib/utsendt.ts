import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Historikk over alt vi har sendt til kunden på en bestilling.
 * Poenget er at ingen skal sende samme kvittering to ganger
 * fordi de ikke vet om noen andre allerede gjorde det.
 */

/** Hva slags melding det var. Samme verdier ligger i kolonnen «slag». */
export type Slag = 'bekreftelse' | 'ferdig' | 'varsel' | 'henting';

/** Navnene vi bruker i admin. */
export const SLAG_NAVN: Record<Slag, string> = {
  bekreftelse: 'Bestillingsbekreftelse',
  ferdig: 'Ferdig kvittering',
  varsel: 'Varsel til oss',
  henting: 'SMS: klar til henting',
};

/** Rekkefølgen de vises i. */
export const SLAG_REKKE: Slag[] = ['bekreftelse', 'ferdig', 'henting', 'varsel'];

export type Utsendt = {
  id: string;
  order_id: string;
  slag: string;
  kanal: string;
  til: string | null;
  ok: boolean;
  detalj: string | null;
  created_at: string;
};

export type NyUtsendt = {
  orderId: string;
  slag: Slag;
  kanal?: 'epost' | 'sms';
  til?: string;
  ok?: boolean;
  detalj?: string;
};

/**
 * Skriver ned at vi har sendt noe. Kaster aldri – en bestilling skal
 * ikke stoppe fordi historikken ikke lot seg lagre. Mangler tabellen
 * (fordi SQL-en ikke er kjørt ennå), havner det bare i server-loggen.
 */
export async function loggUtsendt(
  service: SupabaseClient,
  rader: NyUtsendt[]
): Promise<void> {
  if (rader.length === 0) return;
  const { error } = await service.from('order_messages').insert(
    rader.map((r) => ({
      order_id: r.orderId,
      slag: r.slag,
      kanal: r.kanal ?? 'epost',
      til: (r.til ?? '').slice(0, 300),
      ok: r.ok !== false,
      detalj: (r.detalj ?? '').slice(0, 500),
    }))
  );
  if (error) {
    console.error('[utsendt] klarte ikke å lagre historikken:', error.message);
  }
}

/** Standardteksten, hvis ingen har endret malen i innstillingene. */
export const STANDARD_SMS_HENTING =
  'Hei {kunde}! Bestillingen din fra {bedrift} er klar til henting i {adresse}. ' +
  'Prisen er {pris}. Gi gjerne beskjed før du kommer, så står den klar.';

/** Bytter ut {kunde}, {pris} og de andre feltene i en mal. */
export function flett(mal: string, verdier: Record<string, string>): string {
  return mal.replace(/\{(\w+)\}/g, (hele, navn: string) =>
    navn in verdier ? verdier[navn] : hele
  );
}

/** «Ola Nordmann» → «Ola». Tomt navn gir tom streng. */
export function fornavn(navn: string | null | undefined): string {
  return String(navn ?? '').trim().split(/\s+/)[0] ?? '';
}

/** 28. sep 14:02 */
export function visTidspunkt(iso: string): string {
  return new Date(iso).toLocaleString('nb-NO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
