import Link from 'next/link';
import { getSiteFor } from '@/lib/data';
import { num, text, bool, kr, formatPhone, telHref } from '@/lib/settings';
import { Reveal, Stagger, StaggerItem } from '@/components/Reveal';
import { Blobs } from '@/components/Blobs';
import { PrinterAnimation } from '@/components/PrinterAnimation';
import { ProductCard } from '@/components/ProductCard';
import { Anmeldelser } from '@/components/Anmeldelser';
import { SplitText } from '@/components/glass/SplitText';
import { CountUp } from '@/components/glass/CountUp';
import { Tilt } from '@/components/glass/Tilt';
import { Steps } from '@/components/glass/Steps';
import { ScrollVideo } from '@/components/glass/ScrollVideo';

export const dynamic = 'force-dynamic';

export default async function Hjem({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const site = await getSiteFor(searchParams);
  const s = site.settings;
  const valuta = text(s, 'pris_valuta', 'kr');
  const startpris = num(s, 'pris_startpris', 100);
  const aktiveMaterialer = site.materials.filter((m) => m.active !== false);
  const materialNavn =
    aktiveMaterialer.length > 1
      ? `${aktiveMaterialer.slice(0, -1).map((m) => m.name).join(', ')} eller ${
          aktiveMaterialer[aktiveMaterialer.length - 1].name
        }`
      : aktiveMaterialer[0]?.name ?? 'PLA';
  const brukStartpris = bool(s, 'pris_startpris_pa', true);
  const radius = num(s, 'levering_radius_km', 3);
  const dagerMin = num(s, 'levering_dager_min', 2);
  const dagerMaks = num(s, 'levering_dager_maks', 4);
  const telefon = text(s, 'kontakt_telefon', '41381608');
  const ringetid = text(s, 'kontakt_ringetid');
  const meldingstid = text(s, 'kontakt_meldingstid');
  const ringerTilbake = text(s, 'kontakt_ringer_tilbake');
  const hjemlevering =
    site.deliveryOptions.find((d) => Number(d.price) > 0) ?? { name: 'Hjemlevering', price: 50 };
  const visAnmeldelser = bool(s, 'anmeldelser_pa', true) && site.reviews.length > 0;
  const utvalgte = site.products.filter((p) => p.featured).slice(0, 3);
  const nyeste = (utvalgte.length ? utvalgte : site.products).slice(0, 3);

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden pb-20 pt-14 sm:pt-20">
        <Blobs />
        <div aria-hidden className="drop" style={{ width: 90, height: 90, left: '46%', top: 40 }} />
        <div aria-hidden className="drop hidden sm:block" style={{ width: 46, height: 46, left: '3%', top: '52%', animationDelay: '-3s' }} />
        <div aria-hidden className="drop" style={{ width: 140, height: 140, right: '2%', bottom: 40, animationDelay: '-5s', animationDuration: '12s' }} />
        <div className="container-x grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Reveal>
              <span className="eyebrow">
                <span className="live-dot relative h-1.5 w-1.5 rounded-full bg-brand-500" />
                Elevbedrift på {text(s, 'bedrift_skole', 'Skranevatnet skole')}
              </span>
            </Reveal>

            <SplitText
              as="h1"
              delay={0.08}
              highlight="i 3D"
              text={text(s, 'tekst_hero_tittel', 'Vi printer, fikser og designer det du trenger i 3D')}
              className="mt-5 text-balance text-4xl font-bold leading-[1.06] sm:text-5xl lg:text-[3.4rem]"
            />

            <Reveal delay={0.12}>
              <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-600">
                {text(s, 'tekst_hero_ingress', '')}
              </p>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/bestill" className="btn-primary" data-mag>
                  Bestill og se prisen
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M5 12h14m0 0-5.5-5.5M19 12l-5.5 5.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
                <Link href="/galleri" className="btn-ghost">
                  Se ferdige modeller
                </Link>
                <a href={telHref(telefon)} className="btn-ghost">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M6.5 3.5h3l1.5 4-2 1.4a12 12 0 0 0 6.1 6.1l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Ring {formatPhone(telefon)}
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.24}>
              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-ink-100 pt-6">
                {[
                  {
                    t: (
                      <>
                        <CountUp to={dagerMin} />–<CountUp to={dagerMaks} />
                      </>
                    ),
                    d: 'virkedager levering',
                  },
                  { t: 'Gratis', d: 'henting på Sandsli' },
                  { t: 'Vipps', d: 'eller kontant' },
                ].map((item) => (
                  <div key={item.d}>
                    <dt className="text-2xl font-bold text-ink-900">{item.t}</dt>
                    <dd className="mt-0.5 text-xs leading-snug text-ink-500">{item.d}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          <div className="lg:pl-6">
            <PrinterAnimation
              materiale={site.materials[0]?.name ?? 'PLA'}
              perGram={site.materials[0]?.price_per_gram ?? 0.8}
              startpris={startpris}
              eksempelVekt={60}
              dagerMin={dagerMin}
              dagerMaks={dagerMaks}
              valuta={valuta}
            />
          </div>
        </div>
      </section>

      {/* ---------------- TJENESTER ---------------- */}
      <section className="relative py-16 sm:py-20">
        <div className="container-x">
          <Reveal>
            <span className="eyebrow">Tjenester</span>
            <SplitText text="Tre ting vi er gode på" className="mt-4 max-w-2xl text-balance text-3xl font-bold sm:text-4xl" />
          </Reveal>

          <Stagger className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                tittel: '3D-print',
                tekst:
                  `Har du en fil, eller vet du hva du vil ha? Vi printer i ${materialNavn} og gir deg pris per gram – ingen skjulte tillegg.`,
                pris: `Fra ${kr(startpris, valuta)} + materialkostnad`,
                ikon: (
                  <path
                    d="M12 2.8 20 7v10l-8 4.2L4 17V7z M12 12l8-5m-8 5-8-5m8 5v9.2"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                ),
              },
              {
                tittel: 'Reparasjon',
                tekst: text(s, 'tekst_reparasjon', ''),
                pris: text(s, 'pris_reparasjon', 'Pris etter avtale'),
                ikon: (
                  <path
                    d="M14.7 6.3a4 4 0 0 1 5.3 5.3l-8.5 8.5-4.2 1 1-4.2zM4 4l4 4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ),
              },
              {
                tittel: 'Vi designer for deg',
                tekst:
                  'Ingen 3D-fil? Send oss en tegning med mål, eller la oss lage modellen fra bunnen av. Vi kan også komme hjem til deg og måle opp.',
                pris: `+${kr(site.extras[0]?.price ?? 100, valuta)} for design`,
                ikon: (
                  <path
                    d="M4 19h16M6.5 15.5 17 5a2.1 2.1 0 0 1 3 3L9.5 18.5 5 20z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ),
              },
            ].map((kort) => (
              <StaggerItem key={kort.tittel} className="h-full">
                <Tilt className="h-full">
                <div className="glass group relative h-full overflow-hidden rounded-[28px] p-6">
                  <div
                    aria-hidden
                    className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(150,189,251,.55),rgba(193,216,253,.15)_70%)] blur-[2px] transition-transform duration-500 group-hover:scale-[2.6]"
                  />
                  <div className="relative">
                    <span className="glass-icon drawn inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                        {kort.ikon}
                      </svg>
                    </span>
                    <h3 className="mt-5 text-lg font-semibold">{kort.tittel}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-600">{kort.tekst}</p>
                    <p className="mt-4 text-sm font-bold text-brand-700">{kort.pris}</p>
                  </div>
                </div>
                </Tilt>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ---------------- PRISER ---------------- */}
      <section className="relative py-16 sm:py-20">
        <Blobs variant="soft" />
        <div className="container-x">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <Reveal>
              <span className="eyebrow">Priser</span>
              <SplitText text="Åpne priser, ingen overraskelser" className="mt-4 text-balance text-3xl font-bold sm:text-4xl" />
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-600">
                {text(s, 'tekst_godkjenning', '')}
              </p>
              <Link href="/bestill" className="btn-primary mt-6" data-mag>
                Regn ut prisen din
              </Link>
            </Reveal>

            <Stagger className="grid gap-4 sm:grid-cols-2">
              {site.materials.map((m) => (
                <StaggerItem key={m.id} className="h-full">
                  <Tilt className="h-full" lift={4}>
                  <div className="glass h-full rounded-[28px] p-6">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="live-dot relative h-3 w-3 rounded-full"
                        style={{ background: m.color || '#2559C7' }}
                      />
                      <h3 className="text-lg font-semibold">{m.name}</h3>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-ink-900">
                      <CountUp to={m.price_per_gram} decimals={2} />
                      <span className="ml-1 text-sm font-semibold text-ink-500">{valuta}/gram</span>
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-ink-500">{m.description}</p>
                  </div>
                  </Tilt>
                </StaggerItem>
              ))}

              <StaggerItem className="h-full sm:col-span-2">
                <div className="glass glass-tint h-full rounded-[28px] p-6">
                  <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-brand-700">
                    I tillegg
                  </h3>
                  <ul className="mt-4 grid gap-2.5 text-sm text-ink-700 sm:grid-cols-2">
                    {brukStartpris && (
                      <li className="glass-row flex items-baseline justify-between gap-3 rounded-2xl px-4 py-3">
                        <span>Startpris når vi lager noe</span>
                        <span className="font-bold text-ink-900">{kr(startpris, valuta)}</span>
                      </li>
                    )}
                    {site.extras.map((e) => (
                      <li
                        key={e.id}
                        className="glass-row flex items-baseline justify-between gap-3 rounded-2xl px-4 py-3"
                      >
                        <span>{e.name}</span>
                        <span className="font-bold text-ink-900">+{kr(e.price, valuta)}</span>
                      </li>
                    ))}
                    <li className="glass-row flex items-baseline justify-between gap-3 rounded-2xl px-4 py-3">
                      <span>Henting på Sandsli</span>
                      <span className="font-bold text-emerald-600">Gratis</span>
                    </li>
                    <li className="glass-row flex items-baseline justify-between gap-3 rounded-2xl px-4 py-3">
                      <span>
                        {hjemlevering.name} (innen {radius} km)
                      </span>
                      <span className="font-bold text-ink-900">{kr(hjemlevering.price, valuta)}</span>
                    </li>
                  </ul>
                  {brukStartpris && (
                    <p className="mt-3 text-xs text-ink-500">
                      Ferdige modeller i galleriet har fast pris – der kommer ingen startpris i
                      tillegg.
                    </p>
                  )}
                </div>
              </StaggerItem>
            </Stagger>
          </div>
        </div>
      </section>

      {/* ---------------- SLIK GJØR DU DET ---------------- */}
      <section className="relative py-16 sm:py-20">
        <div className="container-x">
          <Reveal>
            <span className="eyebrow">Slik gjør du det</span>
            <SplitText text="Fra idé til ferdig print i fire steg" className="mt-4 max-w-2xl text-balance text-3xl font-bold sm:text-4xl" />
          </Reveal>

          <Steps
            steps={[
              {
                n: '1',
                t: 'Velg og se prisen',
                d: 'På bestillingssiden velger du materiale og størrelse, og prisen står rett ved siden av mens du velger.',
              },
              {
                n: '2',
                t: 'Send bestillingen',
                d: `Fyll inn navn, mobil og e-post, og trykk send. Bestillingen kommer rett inn til oss, og du får en bekreftelse på e-post med en gang. Vil du heller ringe, er det like greit: ${formatPhone(telefon)}.`,
              },
              {
                n: '3',
                t: 'Vi tar kontakt',
                d: 'Vi ringer eller sender melding for å avtale detaljene, og gir deg en endelig pris. Ferdige modeller fra galleriet har fast pris – dem setter vi i gang med med en gang.',
              },
              {
                n: '4',
                t: 'Hent eller få det levert',
                d: `Ferdig på ${dagerMin}–${dagerMaks} virkedager. Betal med Vipps, eller kontant hvis du sier fra.`,
              },
            ]}
          />
        </div>
      </section>

      {/* ---------------- KONTAKT ---------------- */}
      <section className="relative py-16 sm:py-20">
        <Blobs variant="soft" />
        <div className="container-x">
          <Reveal>
            <span className="eyebrow">Kontakt</span>
            <SplitText text="Bestill slik det passer deg" className="mt-4 max-w-2xl text-balance text-3xl font-bold sm:text-4xl" />
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-600">
              Du velger selv om du vil skrive eller snakke. Begge deler ender samme sted – hos oss.
            </p>
          </Reveal>

          <Stagger className="mt-9 grid gap-5 md:grid-cols-2">
            <StaggerItem className="h-full">
              <Tilt className="h-full" lift={4}>
              <div className="glass group flex h-full flex-col rounded-[28px] p-7">
                <span className="glass-icon drawn inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white transition-transform duration-500 group-hover:-rotate-12">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.2-.6L3 21l1.8-5.1A8.2 8.2 0 0 1 3.6 11.5 8.4 8.4 0 0 1 12.6 3a8.4 8.4 0 0 1 8.4 8.5z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold">Bestill på nettsiden</h3>
                  <span className="chip chip-shine">Åpent 24/7</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{meldingstid}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">
                  Bestillingen kommer rett inn til oss, du får bekreftelse på e-post, og vi tar
                  kontakt så fort vi kan.
                </p>
                <Link href="/bestill" className="btn-primary mt-6 self-start" data-mag>
                  Bestill nå
                </Link>
              </div>
              </Tilt>
            </StaggerItem>

            <StaggerItem className="h-full">
              <Tilt className="h-full" lift={4}>
              <div className="glass group flex h-full flex-col rounded-[28px] p-7">
                <span className="glass-icon dark drawn inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-900 text-white transition-transform duration-500 group-hover:rotate-12">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M6.5 3.5h3l1.5 4-2 1.4a12 12 0 0 0 6.1 6.1l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold">Ring oss</h3>
                  <span className="chip chip-shine">15–21, man–lør</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{ringetid}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{ringerTilbake}</p>
                <a href={telHref(telefon)} className="btn-dark mt-6 self-start" data-mag>
                  Ring {formatPhone(telefon)}
                </a>
              </div>
              </Tilt>
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      {/* ---------------- GALLERI-TEASER ---------------- */}
      {nyeste.length > 0 && (
        <section className="relative py-16 sm:py-20">
          <div className="container-x">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <span className="eyebrow">Galleri</span>
                  <SplitText text="Ferdige modeller du kan kjøpe" className="mt-4 text-balance text-3xl font-bold sm:text-4xl" />
                </div>
                <Link href="/galleri" className="btn-ghost">
                  Se alle modellene
                </Link>
              </div>
            </Reveal>

            <Stagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {nyeste.map((p) => (
                <StaggerItem key={p.id} className="h-full">
                  <ProductCard product={p} currency={valuta} />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      {/* ---------------- ANMELDELSER ---------------- */}
      {visAnmeldelser && (
        <Anmeldelser
          anmeldelser={site.reviews}
          tittel={text(s, 'anmeldelser_tittel', 'Hva kundene sier')}
          undertittel={text(s, 'anmeldelser_undertittel', '')}
          sekunder={num(s, 'anmeldelser_rotasjon', 6)}
        />
      )}

      {/* ---------------- CTA ---------------- */}
      <section className="py-16 sm:py-20">
        <div className="container-x">
          <Reveal>
            <ScrollVideo>
              <div className="relative mx-auto max-w-2xl">
                <SplitText
                  text="Har du en idé? Vi fikser resten."
                  className="text-balance text-3xl font-bold text-white sm:text-4xl"
                />
                <p className="mt-4 text-[15px] leading-relaxed text-ink-300">
                  Du trenger ikke vite noe om 3D-printing. Beskriv hva du vil ha, så hjelper vi deg
                  med resten – og du får alltid pris før vi starter.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link href="/bestill" className="btn-primary" data-mag>
                    Bestill nå
                  </Link>
                  <a href={telHref(telefon)} className="btn btn-glass-dark">
                    Ring {formatPhone(telefon)}
                  </a>
                </div>
                <p className="mt-5 text-xs text-ink-400">
                  Melding: hele døgnet · Telefon: {ringetid}
                </p>
              </div>
            </ScrollVideo>
          </Reveal>
        </div>
      </section>
    </>
  );
}
