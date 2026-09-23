import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getServiceClient } from '@/lib/supabase/server';
import { SITE_TAG } from '@/lib/data';

export const dynamic = 'force-dynamic';

/**
 * Publiserer nettsiden: tømmer hurtigbufferen slik at alt dere har endret
 * i adminpanelet blir synlig for besøkende med en gang.
 */
export async function POST(request: Request) {
  const service = getServiceClient();
  if (!service) {
    return NextResponse.json(
      {
        error:
          'Serveren mangler SUPABASE_SERVICE_ROLE_KEY. Legg den inn som miljøvariabel i Vercel, så virker publisering.',
      },
      { status: 500 }
    );
  }

  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) {
    return NextResponse.json({ error: 'Du må være logget inn.' }, { status: 401 });
  }

  const { data, error } = await service.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json(
      { error: 'Innloggingen er utløpt. Logg inn på nytt og prøv igjen.' },
      { status: 401 }
    );
  }

  const { data: profil } = await service
    .from('profiles')
    .select('name, email')
    .eq('id', data.user.id)
    .maybeSingle();

  const naa = new Date().toISOString();

  const { error: statusFeil } = await service
    .from('site_status')
    .upsert(
      {
        id: 1,
        sist_publisert: naa,
        publisert_av: profil?.name || profil?.email || data.user.email || '',
      },
      { onConflict: 'id' }
    );

  if (statusFeil) {
    return NextResponse.json(
      {
        error:
          'Fant ikke publiseringsstatusen i databasen. Kjør supabase/schema.sql på nytt i Supabase.',
      },
      { status: 500 }
    );
  }

  revalidateTag(SITE_TAG);

  return NextResponse.json({ ok: true, sist_publisert: naa });
}
