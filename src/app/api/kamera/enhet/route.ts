import { NextResponse } from 'next/server';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/supabase/server';
import { KAMERA_BOTTE, lesInnstillinger } from '@/lib/kamera';

export const dynamic = 'force-dynamic';

/**
 * Brukes BARE av Raspberry Pi-en. Pi-en viser koblingsnøkkelen sin og får
 * engangslenker for å laste opp kamerabilder og timelapser rett til lagringen.
 * (Status og innstillinger går direkte mot databasen med kamera_enhet_synk.)
 */

const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

async function nokkelOk(service: SupabaseClient, nokkel: string): Promise<boolean> {
  if (!nokkel || nokkel.length < 20 || nokkel.length > 200) return false;
  const { data } = await service.from('kamera_enhet').select('nokkel_hash').eq('id', 1).maybeSingle();
  const lagret = data?.nokkel_hash as string | undefined;
  if (!lagret) return false;
  const a = Buffer.from(sha256(nokkel), 'hex');
  const b = Buffer.from(lagret, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

const unik = () => `${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;

/** Lager mange opplastingslenker på én gang (de gjelder i 2 timer). */
async function lenker(service: SupabaseClient, stier: string[]) {
  const ut: { sti: string; url: string }[] = [];
  for (let i = 0; i < stier.length; i += 20) {
    const del = await Promise.all(
      stier.slice(i, i + 20).map(async (sti) => {
        const { data, error } = await service.storage.from(KAMERA_BOTTE).createSignedUploadUrl(sti);
        return error || !data ? null : { sti, url: data.signedUrl };
      })
    );
    for (const d of del) if (d) ut.push(d);
  }
  return ut;
}

/** Rydder: beholder bare de nyeste bildene i live/. */
async function ryddLive(service: SupabaseClient, behold: number) {
  const { data } = await service.storage
    .from(KAMERA_BOTTE)
    .list('live', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });
  const gamle = (data ?? []).slice(behold).map((f) => `live/${f.name}`);
  for (let i = 0; i < gamle.length; i += 100) {
    await service.storage.from(KAMERA_BOTTE).remove(gamle.slice(i, i + 100));
  }
}

/** Sletter de eldste timelapsene så det blir plass til en ny. */
async function ryddTimelapser(service: SupabaseClient, maks: number) {
  const { data } = await service
    .from('kamera_timelapser')
    .select('id, sti')
    .order('opprettet', { ascending: false });
  const gamle = (data ?? []).slice(Math.max(0, maks - 1));
  if (!gamle.length) return;
  await service.storage.from(KAMERA_BOTTE).remove(gamle.map((g) => g.sti));
  await service.from('kamera_timelapser').delete().in('id', gamle.map((g) => g.id));
}

export async function POST(request: Request) {
  const service = getServiceClient();
  if (!service) {
    return NextResponse.json({ error: 'Serveren mangler SUPABASE_SERVICE_ROLE_KEY.' }, { status: 500 });
  }
  const auth = request.headers.get('authorization') || '';
  const nokkel = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!(await nokkelOk(service, nokkel))) {
    return NextResponse.json({ error: 'Ugyldig koblingsnøkkel. Lag en ny i admin → Live kamera.' }, { status: 401 });
  }

  let body: { handling?: string; antall?: number } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  switch (body.handling) {
    case 'test':
      return NextResponse.json({ ok: true, tid: new Date().toISOString() });

    case 'opplasting': {
      const antall = Math.min(150, Math.max(1, Math.round(Number(body.antall) || 60)));
      await ryddLive(service, 6);
      const serie = unik();
      const stier = Array.from({ length: antall }, (_, i) => `live/${serie}-${String(i).padStart(3, '0')}.jpg`);
      const urls = await lenker(service, stier);
      if (!urls.length) {
        return NextResponse.json({ error: 'Klarte ikke å lage opplastingslenker. Er SQL-en for live kamera kjørt?' }, { status: 500 });
      }
      return NextResponse.json({ urls, gyldig_sek: 7000 });
    }

    case 'timelapse': {
      const { data } = await service.from('kamera_innstillinger').select('data').eq('id', 1).maybeSingle();
      const innst = lesInnstillinger(data?.data);
      await ryddTimelapser(service, innst.timelapse_maks);
      const dato = new Date().toISOString().slice(0, 10);
      const [lenke] = await lenker(service, [`timelapse/${dato}-${unik()}.mp4`]);
      if (!lenke) return NextResponse.json({ error: 'Klarte ikke å lage opplastingslenke.' }, { status: 500 });
      return NextResponse.json(lenke);
    }

    default:
      return NextResponse.json({ error: 'Ukjent handling.' }, { status: 400 });
  }
}
