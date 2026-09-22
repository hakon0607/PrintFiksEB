import { NextResponse } from 'next/server';
import { krevInnlogget } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

const NOKKEL = 'openai_api_key';

function maskert(verdi: string) {
  if (verdi.length <= 10) return '••••';
  return `${verdi.slice(0, 6)}••••••${verdi.slice(-4)}`;
}

/** Status: finnes det en nøkkel? Alle innloggede ansatte kan se dette. */
export async function GET(request: Request) {
  const sjekk = await krevInnlogget(request);
  if (sjekk.feil) return sjekk.feil;

  const { data } = await sjekk.service
    .from('secrets')
    .select('value, updated_at, updated_by')
    .eq('key', NOKKEL)
    .maybeSingle();

  if (!data?.value) return NextResponse.json({ finnes: false });

  return NextResponse.json({
    finnes: true,
    maskert: maskert(data.value),
    oppdatert: data.updated_at,
    av: data.updated_by,
  });
}

/** Lagre ny nøkkel. Kun eier. */
export async function POST(request: Request) {
  const sjekk = await krevInnlogget(request, true);
  if (sjekk.feil) return sjekk.feil;

  let body: { key?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig forespørsel.' }, { status: 400 });
  }

  const key = (body.key || '').trim();
  if (!key.startsWith('sk-') || key.length < 20) {
    return NextResponse.json(
      { error: 'Dette ser ikke ut som en OpenAI-nøkkel. Den starter med «sk-».' },
      { status: 400 }
    );
  }

  const { error } = await sjekk.service.from('secrets').upsert(
    {
      key: NOKKEL,
      value: key,
      updated_at: new Date().toISOString(),
      updated_by: sjekk.navn,
    },
    { onConflict: 'key' }
  );

  if (error) {
    return NextResponse.json(
      { error: 'Klarte ikke å lagre nøkkelen. Kjør supabase/schema.sql på nytt i Supabase.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, maskert: maskert(key) });
}

/** Slett nøkkelen. Kun eier. */
export async function DELETE(request: Request) {
  const sjekk = await krevInnlogget(request, true);
  if (sjekk.feil) return sjekk.feil;

  await sjekk.service.from('secrets').delete().eq('key', NOKKEL);
  return NextResponse.json({ ok: true });
}
