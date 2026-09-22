import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function lagPassord() {
  const tegn = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ut = '';
  for (let i = 0; i < 12; i += 1) ut += tegn[Math.floor(Math.random() * tegn.length)];
  return ut;
}

/** Sjekker at den som kaller er logget inn og har rollen «eier». */
async function krevEier(request: Request) {
  const service = getServiceClient();
  if (!service) {
    return {
      feil: NextResponse.json(
        {
          error:
            'Serveren mangler SUPABASE_SERVICE_ROLE_KEY. Legg den inn som miljøvariabel i Vercel, så virker dette.',
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
    return { feil: NextResponse.json({ error: 'Innloggingen er utløpt. Logg inn på nytt.' }, { status: 401 }) };
  }

  const { data: profil } = await service
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profil || profil.role !== 'eier') {
    return {
      feil: NextResponse.json(
        { error: 'Bare den som eier siden kan legge til eller fjerne ansatte.' },
        { status: 403 }
      ),
    };
  }

  return { service, user: data.user };
}

export async function POST(request: Request) {
  const sjekk = await krevEier(request);
  if (sjekk.feil) return sjekk.feil;
  const service = sjekk.service!;

  let body: { email?: string; name?: string; role?: string; mode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig forespørsel.' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const name = (body.name || '').trim();
  const role = body.role === 'eier' ? 'eier' : 'medlem';
  const mode = body.mode === 'invite' ? 'invite' : 'password';

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Skriv inn en gyldig e-postadresse.' }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  let userId: string | null = null;
  let passord: string | null = null;

  if (mode === 'invite') {
    const { data, error } = await service.auth.admin.inviteUserByEmail(email, {
      data: { name, role },
      redirectTo: `${origin}/admin/nytt-passord`,
    });
    if (error) {
      return NextResponse.json(
        {
          error:
            error.message.toLowerCase().includes('already')
              ? 'Denne e-posten har allerede en bruker.'
              : 'Klarte ikke å sende invitasjonen. Prøv «Lag passord selv» i stedet.',
        },
        { status: 400 }
      );
    }
    userId = data.user?.id ?? null;
  } else {
    passord = lagPassord();
    const { data, error } = await service.auth.admin.createUser({
      email,
      password: passord,
      email_confirm: true,
      user_metadata: { name, role },
    });
    if (error) {
      return NextResponse.json(
        {
          error: error.message.toLowerCase().includes('already')
            ? 'Denne e-posten har allerede en bruker.'
            : 'Klarte ikke å opprette brukeren.',
        },
        { status: 400 }
      );
    }
    userId = data.user?.id ?? null;
  }

  if (userId) {
    await service
      .from('profiles')
      .upsert({ id: userId, email, name: name || email.split('@')[0], role }, { onConflict: 'id' });

    const { data: finnes } = await service
      .from('team_members')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!finnes) {
      await service.from('team_members').insert({
        user_id: userId,
        name: name || email.split('@')[0],
        email,
        show_on_site: true,
        sort: 100,
      });
    }
  }

  await service.from('invites').insert({
    email,
    name,
    role,
    status: mode === 'invite' ? 'sendt' : 'godtatt',
    invited_by: sjekk.user!.id,
    accepted_at: mode === 'invite' ? null : new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, mode, password: passord, userId });
}

/** Endrer rolle eller navn på en ansatt. Kun eier. */
export async function PATCH(request: Request) {
  const sjekk = await krevEier(request);
  if (sjekk.feil) return sjekk.feil;
  const service = sjekk.service!;

  let body: { id?: string; role?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig forespørsel.' }, { status: 400 });
  }

  const id = (body.id || '').trim();
  if (!id) return NextResponse.json({ error: 'Mangler bruker.' }, { status: 400 });

  const patch: Record<string, string> = {};
  if (body.role === 'eier' || body.role === 'medlem') patch.role = body.role;
  if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim();
  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'Ingenting å endre.' }, { status: 400 });
  }

  // Det må alltid finnes minst én eier
  if (patch.role === 'medlem') {
    const { count } = await service
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'eier');
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Det må være minst én eier. Gjør noen andre til eier først.' },
        { status: 400 }
      );
    }
  }

  const { error } = await service.from('profiles').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: 'Klarte ikke å lagre endringen.' }, { status: 500 });

  if (patch.name) {
    await service.from('team_members').update({ name: patch.name }).eq('user_id', id);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const sjekk = await krevEier(request);
  if (sjekk.feil) return sjekk.feil;
  const service = sjekk.service!;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Mangler bruker.' }, { status: 400 });

  if (id === sjekk.user!.id) {
    return NextResponse.json({ error: 'Du kan ikke fjerne din egen innlogging.' }, { status: 400 });
  }

  await service.from('team_members').update({ user_id: null }).eq('user_id', id);
  const { error } = await service.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: 'Klarte ikke å fjerne brukeren.' }, { status: 400 });

  return NextResponse.json({ ok: true });
}
