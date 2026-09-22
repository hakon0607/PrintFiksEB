import Link from 'next/link';
import { getSiteFor } from '@/lib/data';
import { num, text, bool, kr, formatPhone, telHref } from '@/lib/settings';
import { Reveal, Stagger, StaggerItem } from '@/components/Reveal';
import { Blobs } from '@/components/Blobs';
import { PrinterAnimation } from '@/components/PrinterAnimation';
import { ProductCard } from '@/components/ProductCard';

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
  const utvalgte = site.products.filter((p) => p.featured).slice(0, 3);
  const nyeste = (utvalgte.length ? utvalgte : site.products).slice(0, 3);

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden pb-20 pt-14 sm:pt-20">
        <Blobs />
        <div className="container-x grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Reveal>
              <span className="eyebrow">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                Elevbedrift på {text(s, 'bedrift_skole', 'Skranevatnet skole')}
              </span>
            </Reveal>

            <Reveal delay={0.06}>
              <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.06] sm:text-5xl lg:text-[3.4rem]">
                {text(s, 'tekst_hero_tittel', 'Vi printer, fikser og designer det du trenger i 3D')}
              </h1>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-600">
                {text(s, 'tekst_hero_ingress', '')}
              </p>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/bestill" className="btn-primary">
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
                  { t: `${dagerMin}–${dagerMaks}`, d: 'virkedager levering' },
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
            <PrinterAnimation />
          </div>
        </div>
      </section>

      {/* ---------------- TJENESTER ---------------- */}
      <section className="relative py-16 sm:py-20">
        <div className="container-x">
          <Reveal>
            <span className="eyebrow">Tjenester</span>
            <h2 className="mt-4 max-w-2xl text-balance text-3xl font-bold sm:text-4xl">
              Tre ting vi er gode på
            </h2>
          </Reveal>

          <Stagger className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                tittel: '3D-print',
                tekst:
                  'Har du en fil, eller vet du hva du vil ha? Vi printer i PLA eller PETG og gir deg pris per gram – ingen skjulte tillegg.',
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
                <div className="group relative h-full overflow-hidden rounded-3xl border border-ink-100 bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-lift">
                  <div
                    aria-hidden
                    className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand-50 transition-transform duration-500 group-hover:scale-[2.4]"
                  />
                  <div className="relative">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-glow">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                        {kort.ikon}
                      </svg>
                    </span>
                    <h3 className="mt-5 text-lg font-semibold">{kort.tittel}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-600">{kort.tekst}</p>
                    <p className="mt-4 text-sm font-bold text-brand-700">{kort.pris}</p>
                  </div>
                </div>
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
              <h2 className="mt-4 text-balance text-3xl font-bold sm:text-4xl">
                Åpne priser, ingen overraskelser
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-600">
                {text(s, 'tekst_godkjenning', '')}
              </p>
              <Link href="/bestill" className="btn-primary mt-6">
                Regn ut prisen din
              </Link>
            </Reveal>

            <Stagger className="grid gap-4 sm:grid-cols-2">
              {site.materials.map((m) => (
                <StaggerItem key={m.id} className="h-full">
                  <div className="h-full rounded-3xl border border-ink-100 bg-white p-6 shadow-soft">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ background: m.color || '#2559C7' }}
                      />
                      <h3 className="text-lg font-semibold">{m.name}</h3>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-ink-900">
                      {m.price_per_gram.toLocaleString('nb-NO', { minimumFractionDigits: 2 })}
                      <span className="ml-1 text-sm font-semibold text-ink-500">{valuta}/gram</span>
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-ink-500">{m.description}</p>
                  </div>
                </StaggerItem>
              ))}

              <StaggerItem className="h-full sm:col-span-2">
                <div className="h-full rounded-3xl border border-brand-200 bg-brand-50/70 p-6">
                  <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-brand-700">
                    I tillegg
                  </h3>
                  <ul className="mt-4 grid gap-2.5 text-sm text-ink-700 sm:grid-cols-2">
                    {brukStartpris && (
                      <li className="flex items-baseline justify-between gap-3 rounded-2xl bg-white/80 px-4 py-3">
                        <span>Startpris når vi lager noe</span>
                        <span className="font-bold text-ink-900">{kr(startpris, valuta)}</span>
                      </li>
                    )}
                    {site.extras.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-baseline justify-between gap-3 rounded-2xl bg-white/80 px-4 py-3"
                      >
                        <span>{e.name}</span>
                        <span className="font-bold text-ink-900">+{kr(e.price, valuta)}</span>
                      </li>
                    ))}
                    <li className="flex items-baseline justify-between gap-3 rounded-2xl bg-white/80 px-4 py-3">
                      <span>Henting på Sandsli</span>
                      <span className="font-bold text-emerald-600">Gratis</span>
                    </li>
                    <li className="flex items-baseline justify-between gap-3 rounded-2xl bg-white/80 px-4 py-3">
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
            <h2 className="mt-4 max-w-2xl text-balance text-3xl font-bold sm:text-4xl">
              Fra idé til ferdig print i fire steg
            </h2>
          </Reveal>

          <Stagger className="relative mt-12 grid gap-6 md:grid-cols-4">
            <div
              aria-hidden
              className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent md:block"
            />
            {[
              {
                n: '1',
                t: 'Velg og se prisen',
                d: 'På bestillingssiden velger du materiale og størrelse, og prisen står rett ved siden av mens du velger.',
              },
              {
                n: '2',
                t: 'Send meldingen',
                d: `Du får en ferdig melding du bare sender til oss på ${formatPhone(telefon)}. Vil du heller ringe, er det like greit.`,
              },
              {
                n: '3',
                t: 'Godkjenn prisen',
                d: 'Vi svarer med en endelig pris og hvor lang tid det tar. Vi starter ikke før du har sagt ja.',
              },
              {
                n: '4',
                t: 'Hent eller få det levert',
                d: `Ferdig på ${dagerMin}–${dagerMaks} virkedager. Betal med Vipps, eller kontant hvis du sier fra.`,
              },
            ].map((steg) => (
              <StaggerItem key={steg.n}>
                <div className="relative">
                  <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-200 bg-white text-xl font-bold text-brand-700 shadow-soft">
                    {steg.n}
                  </span>
                  <h3 className="mt-5 text-base font-semibold">{steg.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{steg.d}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ---------------- KONTAKT ---------------- */}
      <section className="relative py-16 sm:py-20">
        <Blobs variant="soft" />
        <div className="container-x">
          <Reveal>
            <span className="eyebrow">Kontakt</span>
            <h2 className="mt-4 max-w-2xl text-balance text-3xl font-bold sm:text-4xl">
              Bestill slik det passer deg
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-600">
              Du velger selv om du vil skrive eller snakke. Begge deler ender samme sted – hos oss.
            </p>
          </Reveal>

          <Stagger className="mt-9 grid gap-5 md:grid-cols-2">
            <StaggerItem className="h-full">
              <div className="flex h-full flex-col rounded-3xl border border-ink-100 bg-white p-7 shadow-soft">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-glow">
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
                  <h3 className="text-lg font-semibold">Send melding</h3>
                  <span className="chip">Åpent 24/7</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{meldingstid}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">
                  Nettsiden lager meldingen ferdig for deg – du trykker bare send. Vi svarer så fort
                  vi ser den.
                </p>
                <Link href="/bestill" className="btn-primary mt-6 self-start">
                  Lag bestillingen min
                </Link>
              </div>
            </StaggerItem>

            <StaggerItem className="h-full">
              <div className="flex h-full flex-col rounded-3xl border border-ink-100 bg-white p-7 shadow-soft">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-900 text-white">
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
                  <span className="chip">15–21, man–lør</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{ringetid}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{ringerTilbake}</p>
                <a href={telHref(telefon)} className="btn-dark mt-6 self-start">
                  Ring {formatPhone(telefon)}
                </a>
              </div>
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
                  <h2 className="mt-4 text-balance text-3xl font-bold sm:text-4xl">
                    Ferdige modeller du kan kjøpe
                  </h2>
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

      {/* ---------------- CTA ---------------- */}
      <section className="py-16 sm:py-20">
        <div className="container-x">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] bg-ink-900 px-7 py-14 text-center sm:px-14">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(40rem 18rem at 20% 0%, rgba(61,118,241,0.38), transparent 62%), radial-gradient(34rem 18rem at 85% 100%, rgba(37,89,199,0.34), transparent 60%)',
                }}
              />
              <div className="relative mx-auto max-w-2xl">
                <h2 className="text-balance text-3xl font-bold text-white sm:text-4xl">
                  Har du en idé? Vi fikser resten.
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-ink-300">
                  Du trenger ikke vite noe om 3D-printing. Beskriv hva du vil ha, så hjelper vi deg
                  med resten – og du får alltid pris før vi starter.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link href="/bestill" className="btn-primary">
                    Bestill nå
                  </Link>
                  <a href={telHref(telefon)} className="btn bg-white/10 text-white hover:bg-white/20">
                    Ring {formatPhone(telefon)}
                  </a>
                </div>
                <p className="mt-5 text-xs text-ink-400">
                  Melding: hele døgnet · Telefon: {ringetid}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
