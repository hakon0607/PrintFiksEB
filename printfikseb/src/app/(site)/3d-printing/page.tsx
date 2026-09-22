import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getSiteFor } from '@/lib/data';
import { num, text, kr, formatPhone, telHref } from '@/lib/settings';
import { Reveal, Stagger, StaggerItem } from '@/components/Reveal';
import { Blobs } from '@/components/Blobs';
import { VideoSpiller } from '@/components/VideoSpiller';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Hva 3D-printing kan fikse',
  description:
    'De fleste vet ikke hva en 3D-printer faktisk kan brukes til. Her er eksempler på ting PrintFiksEB lager og reparerer – og en video av en print underveis.',
};

export default async function TreDPrintingSide({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const site = await getSiteFor(searchParams);
  const s = site.settings;
  const telefon = text(s, 'kontakt_telefon', '41381608');
  const videoUrl = text(s, 'video_url') || '/video/printing.mp4';
  const egenVideo = !text(s, 'video_url');
  const startpris = num(s, 'pris_startpris', 100);
  const valuta = text(s, 'pris_valuta', 'kr');

  const kategorier = [...new Set(site.examples.map((e) => e.category).filter(Boolean))] as string[];

  return (
    <div className="relative pb-24 pt-12 sm:pt-16">
      <Blobs variant="soft" />
      <div className="container-x">
        {/* Intro */}
        <Reveal>
          <span className="eyebrow">3D-printing</span>
          <h1 className="mt-4 max-w-3xl text-balance text-4xl font-bold leading-[1.08] sm:text-5xl">
            {text(s, 'tekst_fikse_tittel', 'Du vet ikke hva en 3D-printer kan fikse')}
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-600">
            {text(s, 'tekst_fikse_ingress', '')}
          </p>
        </Reveal>

        {/* Video */}
        <Reveal delay={0.1}>
          <div className="mt-10">
            <VideoSpiller
              src={videoUrl}
              webm={egenVideo ? '/video/printing.webm' : undefined}
              poster={egenVideo ? '/video/printing-poster.jpg' : undefined}
              tekst="Se en print bli til"
            />
            <p className="mt-3 text-center text-sm text-ink-500">
              Slik ser det ut når printeren bygger opp en del, lag for lag. Hvert lag er tynnere enn
              et hårstrå.
            </p>
          </div>
        </Reveal>

        {/* Hvordan det funker */}
        <Stagger className="mt-14 grid gap-5 sm:grid-cols-3">
          {[
            {
              t: 'Vi bygger i lag',
              d: 'Printeren legger tynne lag med smeltet plast oppå hverandre til delen er ferdig. Derfor kan vi lage former du ikke får kjøpt.',
            },
            {
              t: 'Alt kan måles opp',
              d: 'Har du en ødelagt del? Vi måler den, tegner den på nytt i 3D og printer en ny som passer nøyaktig.',
            },
            {
              t: 'Billig fordi det er plast',
              d: `Materialet koster under en krone per gram. De fleste småting havner på ${kr(startpris + 30, valuta)} til ${kr(startpris + 120, valuta)} totalt.`,
            },
          ].map((k) => (
            <StaggerItem key={k.t} className="h-full">
              <div className="h-full rounded-3xl border border-ink-100 bg-white p-6 shadow-soft">
                <h2 className="text-base font-semibold">{k.t}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{k.d}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        {/* Eksempler */}
        {site.examples.length > 0 && (
          <section className="mt-20">
            <Reveal>
              <span className="eyebrow">Eksempler</span>
              <h2 className="mt-4 max-w-2xl text-balance text-3xl font-bold sm:text-4xl">
                Ting folk ikke vet at vi kan lage
              </h2>
              {kategorier.length > 1 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {kategorier.map((k) => (
                    <span key={k} className="chip">
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </Reveal>

            <Stagger className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {site.examples.map((e) => (
                <StaggerItem key={e.id} className="h-full">
                  <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-lift">
                    {e.image_url && (
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-brand-50">
                        <Image
                          src={e.image_url}
                          alt={e.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-6">
                      {e.category && (
                        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-600">
                          {e.category}
                        </span>
                      )}
                      <h3 className="mt-1.5 text-base font-semibold">{e.title}</h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">
                        {e.description}
                      </p>
                    </div>
                  </article>
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        )}

        {/* Grenser */}
        <Reveal>
          <section className="mt-20 rounded-[2rem] border border-amber-200 bg-amber-50/70 p-7 sm:p-9">
            <h2 className="text-xl font-semibold text-amber-950">Hva vi ikke kan gjøre</h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-amber-900">
              {text(s, 'tekst_fikse_ikke', '')}
            </p>
          </section>
        </Reveal>

        {/* CTA */}
        <Reveal>
          <div className="mt-16 flex flex-col items-start gap-5 rounded-[2rem] bg-ink-900 p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <h2 className="text-2xl font-bold text-white">Har du noe som er ødelagt?</h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-300">
                Send oss et bilde og målene, så sier vi ifra om vi får det til – og hva det koster.
                Det er gratis å spørre.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link href="/bestill" className="btn-primary">
                Bestill nå
              </Link>
              <a href={telHref(telefon)} className="btn bg-white/10 text-white hover:bg-white/20">
                Ring {formatPhone(telefon)}
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
