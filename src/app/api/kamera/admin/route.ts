import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createHash, randomBytes } from 'crypto';
import { krevInnlogget } from '@/lib/server-auth';
import { KAMERA_BOTTE, KAMERA_TAG } from '@/lib/kamera';
import { SIDE_URL } from '@/lib/side-url';

export const dynamic = 'force-dynamic';

const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

/** Oppsettfila Pi-en trenger. Inneholder ingen hemmeligheter utenom koblingsnøkkelen. */
function oppsettfil(nokkel: string) {
  return [
    '# PrintFiksEB – live kamera. Denne fila skal ligge på Raspberry Pi-en som',
    '# /etc/printfiks-kamera.env  (installasjonsskriptet legger den der for deg).',
    '# Del den ikke med andre – den inneholder koblingsnøkkelen.',
    '',
    `SIDE_URL=${SIDE_URL}`,
    `SUPABASE_URL=${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}`,
    `SUPABASE_ANON_KEY=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
    `KAMERA_NOKKEL=${nokkel}`,
    '',
    '# Fyll inn fra printeren (på skjermen: Innstillinger → WLAN, og Innstillinger → Enhet):',
    'PRINTER_IP=',
    'PRINTER_TILGANGSKODE=',
    'PRINTER_SERIENUMMER=',
    '',
  ].join('\n');
}

/**
 * Handlinger fra adminsiden «Live kamera». Alle innloggede ansatte kan bruke dem.
 *  - info:            finnes det en koblingsnøkkel, og når ble den sist brukt?
 *  - ny_nokkel:       lager ny koblingsnøkkel (den gamle slutter å virke)
 *  - fjern_nokkel:    kobler fra Pi-en
 *  - oppdatert:       innstillinger er lagret – oppdater menyen på nettsiden med en gang
 *  - slett_timelapse: sletter en timelapse (både fila og raden)
 */
export async function POST(request: Request) {
  const sjekk = await krevInnlogget(request);
  if (sjekk.feil) return sjekk.feil;
  const { service } = sjekk;

  let body: { handling?: string; id?: number } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig forespørsel.' }, { status: 400 });
  }

  switch (body.handling) {
    case 'info': {
      const { data, error } = await service
        .from('kamera_enhet')
        .select('nokkel_hash, opprettet, sist_brukt')
        .eq('id', 1)
        .maybeSingle();
      if (error) {
        return NextResponse.json(
          { error: 'Fant ikke kamera-tabellene. Kjør supabase/live-kamera.sql i Supabase først.', mangler_sql: true },
          { status: 500 }
        );
      }
      return NextResponse.json({
        har_nokkel: !!data?.nokkel_hash,
        opprettet: data?.opprettet ?? null,
        sist_brukt: data?.sist_brukt ?? null,
      });
    }

    case 'ny_nokkel': {
      const nokkel = `pfk_${randomBytes(32).toString('base64url')}`;
      const { error } = await service
        .from('kamera_enhet')
        .upsert({ id: 1, nokkel_hash: sha256(nokkel), opprettet: new Date().toISOString(), sist_brukt: null });
      if (error) {
        return NextResponse.json({ error: 'Klarte ikke å lagre nøkkelen. Er SQL-en for live kamera kjørt?' }, { status: 500 });
      }
      return NextResponse.json({ nokkel, oppsett: oppsettfil(nokkel) });
    }

    case 'fjern_nokkel': {
      const { error } = await service.from('kamera_enhet').update({ nokkel_hash: null }).eq('id', 1);
      if (error) return NextResponse.json({ error: 'Klarte ikke å koble fra.' }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    case 'oppdatert': {
      revalidateTag(KAMERA_TAG);
      return NextResponse.json({ ok: true });
    }

    case 'slett_timelapse': {
      const id = Number(body.id);
      if (!Number.isInteger(id)) return NextResponse.json({ error: 'Mangler id.' }, { status: 400 });
      const { data } = await service.from('kamera_timelapser').select('sti').eq('id', id).maybeSingle();
      if (data?.sti) await service.storage.from(KAMERA_BOTTE).remove([data.sti]);
      const { error } = await service.from('kamera_timelapser').delete().eq('id', id);
      if (error) return NextResponse.json({ error: 'Klarte ikke å slette.' }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: 'Ukjent handling.' }, { status: 400 });
  }
}
