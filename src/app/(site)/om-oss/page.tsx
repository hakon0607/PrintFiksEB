import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getSiteFor } from '@/lib/data';
import { num, text, kr, formatPhone, telHref } from '@/lib/settings';
import { Reveal, Stagger, StaggerItem } from '@/components/Reveal';
import { Blobs } from '@/components/Blobs';
import { FaqList } from '@/components/Faq';
import { TeamCard } from '@/components/TeamCard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Om oss',
  description:
    'PrintFiksEB er en elevbedrift på Skranevatnet skole. Her kan du lese om oss, hvordan du bestiller, hva det koster og hvordan du betaler.',
};

export default async function OmOssSide({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const site = await getSiteFor(searchParams);
  const s = site.settings;
  const telefon = text(s, 'kontakt_telefon', '41381608');
  const vipps = text(s, 'vipps_nummer', telefon);
  const epost = text(s, 'kontakt_epost');
  const dagerMin = num(s, 'levering_dager_min', 2);
  const dagerMaks = num(s, 'levering_dager_maks', 4);
  const radius = num(s, 'levering_radius_km', 3);
  const valuta = text(s, 'pris_valuta', 'kr');
  const designPris = site.extras.find((e) => e.scope === 'item')?.price ?? 100;
  const besokPris = site.extras.find((e) => e.scope === 'order')?.price ?? 50;
  const ringetid = text(s, 'kontakt_ringetid');
  const meldingstid = text(s, 'kontakt_meldingstid');
  const ringerTilbake = text(s, 'kontakt_ringer_tilbake');

  return (
    <div className="relative pb-24 pt-12 sm:pt-16">
      <Blobs variant="soft" />
      <div className="container-x">
        {/* Intro */}
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <Reveal>
            <span className="eyebrow">Om oss</span>
            <h1 className="mt-4 text-balance text-4xl font-bold sm:text-5xl">
              En elevbedrift som lager ting på ordentlig
            </h1>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-600">{text(s, 'tekst_om_oss', '')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/bestill" className="btn-primary">
                Bestill og se prisen
              </Link>
              <a href={telHref(telefon)} className="btn-ghost">
                Ring {formatPhone(telefon)}
              </a>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-brand-50 via-white to-brand-100 p-10 shadow-lift">
              <div className="relative h-full w-full">
                <Image src="/logo-wordmark.png" alt="PrintFiksEB" fill className="object-contain" />
              </div>
            </div>
          </Reveal>
        </div>

        {/* Nøkkeltall */}
        <Stagger className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            { t: `${dagerMin}–${dagerMaks}`, d: 'virkedager fra godkjent pris' },
            { t: `${radius} km`, d: 'gratis leveringsområde fra skolen' },
            { t: 'PLA + PETG', d: 'materialer vi printer i' },
          ].map((n) => (
            <StaggerItem key={n.d}>
              <div className="h-full rounded-3xl border border-ink-100 bg-white p-6 shadow-soft">
                <p className="text-2xl font-bold text-ink-900">{n.t}</p>
                <p className="mt-1.5 text-sm leading-snug text-ink-500">{n.d}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        {/* Teamet */}
        {site.team.length > 0 && (
          <section className="mt-20">
            <Reveal>
              <span className="eyebrow">Teamet</span>
              <h2 className="mt-4 text-balance text-3xl font-bold sm:text-4xl">Menneskene bak</h2>
            </Reveal>
            <Stagger className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {site.team.map((m) => (
                <StaggerItem key={m.id} className="h-full">
                  <TeamCard member={m} />
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        )}

        {/* Slik bestiller du */}
        <section className="mt-20">
          <Reveal>
            <span className="eyebrow">Slik bestiller du</span>
            <h2 className="mt-4 text-balance text-3xl font-bold sm:text-4xl">Steg for steg</h2>
          </Reveal>

          <Stagger className="mt-9 grid gap-5 md:grid-cols-2">
            {[
              {
                t: 'Har du en 3D-fil?',
                d: 'Supert – skriv det i bestillingen, så avtaler vi hvordan du sender den når vi tar kontakt. Vi tar imot STL, 3MF og STEP.',
              },
              {
                t: 'Har du ikke en fil?',
                d: `Send oss en detaljert tegning med alle mål, så printer vi etter den. Eller så designer vi filen for deg for ${kr(designPris, valuta)}.`,
              },
              {
                t: 'Vil du ikke tegne selv?',
                d: `For ${kr(besokPris, valuta)} ekstra kommer en av oss hjem til deg, tar målene og lager tegningen. Gjelder innenfor ${radius} km fra skolen.`,
              },
              {
                t: 'Pris før vi starter',
                d: 'Du ser et estimat med en gang, og får endelig pris fra oss som du må godkjenne. Vi begynner aldri å printe før du har sagt ja.',
              },
            ].map((k) => (
              <StaggerItem key={k.t} className="h-full">
                <div className="h-full rounded-3xl border border-ink-100 bg-white p-6 shadow-soft">
                  <h3 className="text-base font-semibold">{k.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{k.d}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* Betaling og levering */}
        <section className="mt-20 grid gap-5 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-3xl border border-brand-200 bg-brand-50/70 p-7">
              <h2 className="text-xl font-semibold">Betaling</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-700">
                {text(s, 'betaling_tekst', '')}
              </p>
              <div className="mt-5 inline-flex items-center gap-3 rounded-2xl bg-white px-5 py-3 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-ink-400">
                  Vipps
                </span>
                <span className="text-lg font-bold text-ink-900">{formatPhone(vipps)}</span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="h-full rounded-3xl border border-ink-100 bg-white p-7 shadow-soft">
              <h2 className="text-xl font-semibold">Levering</h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-700">
                {site.deliveryOptions.map((d) => (
                  <li key={d.id} className="flex items-baseline justify-between gap-4">
                    <span>
                      <span className="font-semibold text-ink-900">{d.name}</span> – {d.description}
                    </span>
                    <span className="shrink-0 font-bold text-brand-700">
                      {Number(d.price) === 0 ? 'Gratis' : `${Math.round(Number(d.price))} kr`}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm text-ink-500">
                Vanlig leveringstid er {dagerMin}–{dagerMaks} virkedager etter at du har godkjent
                prisen.
              </p>
            </div>
          </Reveal>
        </section>

        {/* Når kan du nå oss */}
        <section className="mt-20 grid gap-5 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-3xl border border-ink-100 bg-white p-7 shadow-soft">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Bestill på nettsiden</h2>
                <span className="chip">Åpent 24/7</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-700">{meldingstid}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">
                Du fyller inn navn, mobil og e-post – så tar vi kontakt for å avtale resten.
              </p>
              <Link href="/bestill" className="btn-primary mt-5">
                Bestill nå
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="h-full rounded-3xl border border-ink-100 bg-white p-7 shadow-soft">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Ring oss</h2>
                <span className="chip">15–21, man–lør</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-700">{ringetid}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{ringerTilbake}</p>
              <a href={telHref(telefon)} className="btn-dark mt-5">
                Ring {formatPhone(telefon)}
              </a>
            </div>
          </Reveal>
        </section>

        {/* FAQ */}
        {site.faq.length > 0 && (
          <section className="mt-20">
            <Reveal>
              <span className="eyebrow">Spørsmål og svar</span>
              <h2 className="mt-4 text-balance text-3xl font-bold sm:text-4xl">
                Det folk lurer mest på
              </h2>
            </Reveal>
            <div className="mt-9">
              <FaqList items={site.faq} />
            </div>
          </section>
        )}

        {/* Kontakt */}
        <Reveal>
          <div className="mt-20 flex flex-col items-start gap-5 rounded-[2rem] bg-ink-900 p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <h2 className="text-2xl font-bold text-white">Lurer du på noe?</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">
                Bestill på nettsiden når som helst, eller ring oss på {formatPhone(telefon)}
                {epost ? `, eller e-post til ${epost}` : ''}. {ringetid}
              </p>
            </div>
            <a href={telHref(telefon)} className="btn-primary shrink-0">
              Ta kontakt
            </a>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
