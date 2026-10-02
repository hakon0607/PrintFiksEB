import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Lagrer bildene kunden la ved. De kommer inn som data-URL-er i
 * bestillingen, og lastes opp med service-nøkkelen – det finnes ingen
 * åpen opplastingsadresse noen kan misbruke.
 */

export const BOTTE = 'bestillingsbilder';

/** Flere enn dette tar vi ikke imot, uansett hva som sendes inn. */
const MAKS_ANTALL = 2;

/** Grense per bilde på serveren. Nettleseren sikter på 700 kB. */
const MAKS_BYTES = 2 * 1024 * 1024;

type Type = { mime: string; endelse: string };

/**
 * Vi stoler ikke på hva data-URL-en kaller seg – vi leser de første
 * bytene i filen. Da kan ingen sende en zip-fil og kalle den et bilde.
 */
function lesType(buf: Buffer): Type | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: 'image/jpeg', endelse: 'jpg' };
  }
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return { mime: 'image/png', endelse: 'png' };
  }
  if (
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { mime: 'image/webp', endelse: 'webp' };
  }
  return null;
}

function tilBuffer(dataUrl: unknown): Buffer | null {
  if (typeof dataUrl !== 'string') return null;
  const komma = dataUrl.indexOf(',');
  if (!dataUrl.startsWith('data:image/') || komma < 0) return null;
  try {
    return Buffer.from(dataUrl.slice(komma + 1), 'base64');
  } catch {
    return null;
  }
}

/**
 * Laster opp det som faktisk er bilder, og returnerer de offentlige
 * adressene. Et bilde som ikke går gjennom, hoppes over – bestillingen
 * skal ikke ryke fordi et vedlegg var rart.
 */
export async function lagreBilder(
  service: SupabaseClient,
  ordrenr: string,
  innsendte: unknown
): Promise<string[]> {
  if (!Array.isArray(innsendte)) return [];

  const urler: string[] = [];

  for (const [i, rad] of innsendte.slice(0, MAKS_ANTALL).entries()) {
    const buf = tilBuffer(rad);
    if (!buf || buf.length === 0 || buf.length > MAKS_BYTES) continue;

    const type = lesType(buf);
    if (!type) continue;

    const mappe = (ordrenr || 'ukjent').replace(/[^\w-]/g, '');
    const navn = `${mappe}/${Date.now()}-${i + 1}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${type.endelse}`;

    const { error } = await service.storage.from(BOTTE).upload(navn, buf, {
      contentType: type.mime,
      cacheControl: '3600',
      upsert: false,
    });
    if (error) {
      console.error('[bestillingsbilder] opplasting feilet:', error.message);
      continue;
    }

    const { data } = service.storage.from(BOTTE).getPublicUrl(navn);
    urler.push(data.publicUrl);
  }

  return urler;
}
