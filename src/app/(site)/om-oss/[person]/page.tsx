import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSiteFor } from '@/lib/data';
import { text } from '@/lib/settings';
import { kortNavn, medSti } from '@/lib/team';
import { profilLd } from '@/lib/strukturert';
import { SIDE_URL } from '@/lib/side-url';
import { JsonLd } from '@/components/JsonLd';
import { Blobs } from '@/components/Blobs';

export const dynamic = 'force-dynamic';

/** Egen side for hver i teamet – så «hvem er …» i Google og AI-er finner oss. */
async function finn(sti: string, searchParams?: Record<string, string | string[] | undefined>) {
  const site = await getSiteFor(searchParams);
  const team = medSti(site.team);
  return { site, team, m: team.find((x) => x.sti === sti) ?? null };
}

export async function generateMetadata({ params }: { params: { person: string } }): Promise<Metadata> {
  const { site, m } = await finn(params.person);
  if (!m) return { title: 'Fant ikke personen' };
  const bedrift = text(site.settings, 'bedrift_navn', 'PrintFiksEB');
  const skole = text(site.settings, 'bedrift_skole', 'Skranevatnet skole');
  const sted = text(site.settings, 'bedrift_sted', 'Sandsli, Bergen');
  const rolle = m.role ? `${m.role} i ${bedrift}` : `Jobber i ${bedrift}`;
  const kort = kortNavn(m.name);
  const beskrivelse = `Hvem er ${m.name}? ${m.name}${kort ? ` (${kort})` : ''} er ${m.role ? m.role.toLowerCase() : 'med'} i ${bedrift}, elevbedriften på ${skole} i ${sted} som 3D-printer, reparerer og designer.`;
  return {
    title: { absolute: `${m.name} – ${rolle}` },
    description: beskrivelse,
    alternates: { canonical: `/om-oss/${m.sti}` },
    openGraph: {
      type: 'profile',
      title: `${m.name} – ${rolle}`,
      description: beskrivelse,
      images: m.avatar_url ? [m.avatar_url] : ['/icon-512.png'],
    },
  };
}

export default async function PersonSide({
  params,
  searchParams,
}: {
  params: { person: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const { site, team, m } = await finn(params.person, searchParams);
  if (!m) notFound();
  const s = site.settings;
  const bedrift = text(s, 'bedrift_navn', 'PrintFiksEB');
  const skole = text(s, 'bedrift_skole', 'Skranevatnet skole');
  const sted = text(s, 'bedrift_sted', 'Sandsli, Bergen');
  const andre = team.filter((x) => x.id !== m.id);

  return (
    <div className="relative pb-24 pt-10 sm:pt-14">
      <JsonLd data={profilLd(m, SIDE_URL, s)} />
      <Blobs variant="soft" />
      <div className="container-x">
        <Link href="/om-oss" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition-colors hover:text-brand-700">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M19 12H5m0 0 5.5-5.5M5 12l5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Tilbake til om oss
        </Link>

        <article className="mt-6 grid gap-8 rounded-3xl border border-ink-100 bg-white p-6 shadow-soft sm:p-10 md:grid-cols-[220px_1fr] md:items-start">
          <div className="relative mx-auto aspect-square w-44 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 md:w-full">
            {m.avatar_url ? (
              <Image src={m.avatar_url} alt={m.name} fill sizes="220px" className="object-cover" priority />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-5xl font-bold text-white">
                {m.name.split(' ').filter(Boolean).slice(0, 2).map((d) => d[0]?.toUpperCase()).join('')}
              </span>
            )}
          </div>
          <div>
            <span className="eyebrow">Teamet i {bedrift}</span>
            <h1 className="mt-3 text-balance text-3xl font-bold sm:text-5xl">{m.name}</h1>
            {m.role && <p className="mt-2 text-lg font-semibold text-brand-700">{m.role} i {bedrift}</p>}
            <p className="mt-5 text-[17px] leading-relaxed text-ink-700">
              {m.name} jobber i <Link href="/" className="font-semibold text-brand-700 underline underline-offset-4">{bedrift}</Link>
              {m.role ? <>, der {m.name.split(' ')[0]} er {m.role.toLowerCase()}</> : null}. {bedrift} er en elevbedrift på {skole} i {sted} som
              3D-printer, reparerer og designer ting i plast for folk i nærmiljøet.
            </p>
            {m.bio && <p className="mt-4 text-[17px] leading-relaxed text-ink-700">{m.bio}</p>}
            <h2 className="mt-7 text-xl font-bold text-ink-900">Hvem er {m.name}?</h2>
            <p className="mt-2 text-[17px] leading-relaxed text-ink-700">
              {m.name}{kortNavn(m.name) ? ` (${kortNavn(m.name)})` : ''} er {m.role ? `${m.role.toLowerCase()} i` : 'med i'} {bedrift} – en elevbedrift drevet av
              elever på {skole} i {sted}. {bedrift} lager 3D-printede modeller, reservedeler, mobildeksler med eget motiv og
              pepperkakeformer kundene tegner selv. Les mer om bedriften på <Link href="/om-oss" className="font-semibold text-brand-700 underline underline-offset-4">om oss</Link>.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/galleri" className="btn-primary">Se hva vi lager</Link>
              <Link href="/bestill" className="btn-ghost">Bestill</Link>
            </div>
          </div>
        </article>

        {andre.length > 0 && (
          <section className="mt-14">
            <h2 className="text-2xl font-bold">Resten av teamet</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {andre.map((a) => (
                <li key={a.id}>
                  <Link href={`/om-oss/${a.sti}`} className="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white px-5 py-4 shadow-soft transition hover:border-brand-200 hover:shadow-lift">
                    <span>
                      <span className="block font-semibold text-ink-900">{a.name}</span>
                      {a.role && <span className="block text-sm text-brand-700">{a.role}</span>}
                    </span>
                    <span aria-hidden className="text-ink-300">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
