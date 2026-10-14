import type { Metadata } from 'next';
import { getSiteFor } from '@/lib/data';
import { num, text } from '@/lib/settings';
import { getPublicServerClient } from '@/lib/supabase/server';
import { DekselGenerator, type DekselModell } from '@/components/DekselGenerator';
import { lesFilamenter } from '@/lib/deksel/farger';
import { Reveal } from '@/components/Reveal';
import { Blobs } from '@/components/Blobs';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Lag ditt eget mobildeksel',
  description:
    'Last opp et bilde eller en logo, velg farger og se dekselet ditt med en gang. PrintFiksEB printer motivet rett inn i dekselet.',
};

async function hentModeller(): Promise<DekselModell[]> {
  const sb = getPublicServerClient();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from('deksel_modeller')
      .select('id,navn,analyse:bakside')
      .eq('aktiv', true)
      .order('sort')
      .order('navn');
    if (error || !data) return [];
    return (data as DekselModell[]).filter((m) => m.analyse && Array.isArray(m.analyse.trygg));
  } catch {
    return [];
  }
}

export default async function DekselSide({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const [site, modeller] = await Promise.all([getSiteFor(searchParams), hentModeller()]);
  const s = site.settings;

  return (
    <div className="relative pb-24 pt-10 sm:pt-14">
      <Blobs variant="soft" />
      <div className="container-x">
        <Reveal>
          <span className="eyebrow">Dekselgenerator</span>
          <h1 className="mt-4 max-w-2xl text-balance text-4xl font-bold sm:text-5xl">
            Lag ditt eget mobildeksel
          </h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-600">
            Last opp et bilde eller en logo, flytt det dit du vil, og velg farger. Du ser med en gang
            hvordan dekselet blir – motivet printes rett inn i baksiden.
          </p>
        </Reveal>

        <div className="mt-10">
          <DekselGenerator
            modeller={modeller}
            filamenter={lesFilamenter(text(s, 'deksel_farger', ''))}
            grunnpris={num(s, 'deksel_grunnpris', 59)}
            perFarge={num(s, 'deksel_pris_per_farge', 10)}
            maksFarger={Math.max(1, Math.min(6, num(s, 'deksel_maks_farger', 3)))}
          />
        </div>
      </div>
    </div>
  );
}
