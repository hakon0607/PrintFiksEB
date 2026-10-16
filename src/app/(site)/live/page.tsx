import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hentKameraFersk } from '@/lib/kamera-server';
import { LiveKamera } from '@/components/live/LiveKamera';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}): Promise<Metadata> {
  const k = await hentKameraFersk();
  // skjult: gi en ekte 404 (her, før siden begynner å strømme ut)
  if (k.modus === 'skjult' && !searchParams?.forhandsvis) notFound();
  const aapen = k.modus === 'demo' || k.modus === 'pa';
  return {
    title: k.innst.fanenavn,
    description: aapen
      ? 'Se 3D-printeren til PrintFiksEB jobbe live – lag for lag, rett fra verkstedet på Sandsli i Bergen.'
      : 'Snart kan du se 3D-printeren til PrintFiksEB jobbe live her.',
    alternates: { canonical: '/live' },
    robots: aapen ? undefined : { index: false, follow: true },
  };
}

export default async function LiveSide({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const forhandsvis = !!searchParams?.forhandsvis;
  const kamera = await hentKameraFersk();
  // «Skjult» i admin: siden finnes ikke for besøkende (men kan forhåndsvises fra admin)
  if (kamera.modus === 'skjult' && !forhandsvis) notFound();

  return (
    <LiveKamera
      start={kamera}
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL || ''}
      forhandsvis={forhandsvis}
    />
  );
}
