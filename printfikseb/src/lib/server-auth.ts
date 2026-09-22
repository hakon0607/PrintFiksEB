import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from './supabase/server';

type Resultat =
  | { feil: NextResponse; service?: undefined; bruker?: undefined; rolle?: undefined }
  | {
      feil?: undefined;
      service: SupabaseClient;
      bruker: { id: string; email?: string };
      rolle: string;
      navn: string;
    };

/** Sjekker at den som kaller er innlogget ansatt. Med krevEier kreves rollen «eier». */
export async function krevInnlogget(request: Request, krevEier = false): Promise<Resultat> {
  const service = getServiceClient();
  if (!service) {
    return {
      feil: NextResponse.json(
        {
          error:
            'Serveren mangler SUPABASE_SERVICE_ROLE_KEY. Legg den inn som miljøvariabel i Vercel.',
        },
        { status: 500 }
      ),
    };
  }

  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) {
    return { feil: NextResponse.json({ error: 'Du må være logget inn.' }, { status: 401 }) };
  }

  const { data, error } = await service.auth.getUser(token);
  if (error || !data.user) {
    return {
      feil: NextResponse.json(
        { error: 'Innloggingen er utløpt. Logg inn på nytt og prøv igjen.' },
        { status: 401 }
      ),
    };
  }

  const { data: profil } = await service
    .from('profiles')
    .select('role, name, email')
    .eq('id', data.user.id)
    .maybeSingle();

  const rolle = profil?.role ?? 'medlem';

  if (krevEier && rolle !== 'eier') {
    return {
      feil: NextResponse.json(
        { error: 'Bare den som eier siden kan gjøre dette.' },
        { status: 403 }
      ),
    };
  }

  return {
    service,
    bruker: { id: data.user.id, email: data.user.email ?? undefined },
    rolle,
    navn: profil?.name || profil?.email || data.user.email || '',
  };
}

/** Miljøvariabelen som svarer til en lagret hemmelighet. */
const MILJOVARIABEL: Record<string, string | undefined> = {
  openai_api_key: process.env.OPENAI_API_KEY,
};

/**
 * Henter en API-nøkkel. Kun server-side.
 * Er den lagt inn i adminpanelet, brukes den. Ellers brukes miljøvariabelen
 * fra Vercel, slik at dere kan velge hvilken av delene dere vil.
 */
export async function hentHemmelighet(
  service: SupabaseClient,
  key: string
): Promise<string | null> {
  const { data, error } = await service.from('secrets').select('value').eq('key', key).maybeSingle();
  if (!error && data?.value) return data.value;

  const fraMiljo = MILJOVARIABEL[key];
  return fraMiljo && fraMiljo.trim() ? fraMiljo.trim() : null;
}

/** Sier hvor nøkkelen kommer fra, uten å avsløre selve nøkkelen. */
export async function hemmelighetKilde(
  service: SupabaseClient,
  key: string
): Promise<{ kilde: 'admin' | 'vercel' | null; verdi: string | null }> {
  const { data, error } = await service.from('secrets').select('value').eq('key', key).maybeSingle();
  if (!error && data?.value) return { kilde: 'admin', verdi: data.value };

  const fraMiljo = MILJOVARIABEL[key];
  if (fraMiljo && fraMiljo.trim()) return { kilde: 'vercel', verdi: fraMiljo.trim() };

  return { kilde: null, verdi: null };
}
