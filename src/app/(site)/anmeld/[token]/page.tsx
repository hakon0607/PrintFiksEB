import type { Metadata } from 'next';
import Link from 'next/link';
import { getServiceClient } from '@/lib/supabase/server';
import { kortNavn } from '@/lib/anmeldelse';
import { AnmeldelseSkjema } from '@/components/AnmeldelseSkjema';
import { Blobs } from '@/components/Blobs';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Skriv en anmeldelse',
  robots: { index: false, follow: false },
};

export default async function AnmeldSide({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams?: { stjerner?: string };
}) {
  const service = getServiceClient();
  const token = String(params.token ?? '').slice(0, 64);
  const { data: ordre } = service && /^[\w-]{10,64}$/.test(token)
    ? await service.from('orders').select('id,ordrenr,kunde').eq('anmeldelse_token', token).maybeSingle()
    : { data: null };

  if (!service || !ordre) {
    return (
      <div className="relative pb-24 pt-16">
        <Blobs variant="soft" />
        <div className="container-x max-w-xl text-center">
          <h1 className="text-3xl font-bold">Fant ikke lenken</h1>
          <p className="mt-3 text-ink-600">
            Lenken er feil eller gammel. Bruk lenken fra e-posten du fikk fra oss, eller send oss en melding.
          </p>
          <Link href="/" className="btn-primary mt-6">Til forsiden</Link>
        </div>
      </div>
    );
  }

  const o = ordre as { id: string; ordrenr: string | null; kunde: string | null };
  const [{ data: varer }, { data: tidligere }] = await Promise.all([
    service.from('order_items').select('name').eq('order_id', o.id).order('sort'),
    service.from('reviews').select('name,quote,stars,active').eq('order_id', o.id).maybeSingle(),
  ]);
  const t = tidligere as { name: string; quote: string; stars: number; active: boolean } | null;
  const fornavn = String(o.kunde ?? '').trim().split(/\s+/)[0] || '';
  const start = Math.max(0, Math.min(5, Math.round(Number(searchParams?.stjerner ?? 0)))) || t?.stars || 0;

  return (
    <div className="relative pb-24 pt-10 sm:pt-14">
      <Blobs variant="soft" />
      <div className="container-x max-w-2xl">
        <span className="eyebrow">Anmeldelse</span>
        <h1 className="mt-4 text-balance text-3xl font-bold sm:text-4xl">
          {fornavn ? `Hei ${fornavn}!` : 'Hei!'} Hvordan synes du det ble?
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
          Gjelder bestilling {o.ordrenr ? `#${o.ordrenr}` : ''}
          {((varer as { name: string }[] | null) ?? []).length > 0 &&
            ` – ${((varer as { name: string }[]) ?? []).map((v) => v.name).join(', ')}`}
          . Vi leser alt, og de beste viser vi på nettsiden.
        </p>
        <div className="mt-8">
          <AnmeldelseSkjema
            token={token}
            startStjerner={start}
            startNavn={t?.name || kortNavn(String(o.kunde ?? ''))}
            startTekst={t?.quote ?? ''}
            publisert={!!t?.active}
          />
        </div>
      </div>
    </div>
  );
}
