'use client';

/**
 * Live kamera-siden. Viser «kommer snart», demo eller live-bildet fra printeren
 * (Bambu Lab P1S) – alt etter hva som er valgt i admin → Live kamera.
 * Henter nytt bilde og ny status fra databasen med jevne mellomrom.
 */
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import { tidIgjen, tilOffentlig, tilstandTekst, type KameraOffentlig } from '@/lib/kamera';
import { PrinterTegning } from './PrinterTegning';

const OSLO = 'Europe/Oslo';
const klokkeslett = (iso: string) =>
  new Date(iso).toLocaleTimeString('nb-NO', { timeZone: OSLO, hour: '2-digit', minute: '2-digit', second: '2-digit' });
const datoOgTid = (iso: string) =>
  new Date(iso).toLocaleString('nb-NO', { timeZone: OSLO, day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

/** Tilfeldig id per fane, så vi kan telle hvor mange som ser på (uten informasjonskapsler). */
function seerId(): string {
  try {
    let id = sessionStorage.getItem('pf-seer');
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem('pf-seer', id);
    }
    return id;
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

export function LiveKamera({
  start,
  supabaseUrl,
  forhandsvis = false,
}: {
  start: KameraOffentlig;
  supabaseUrl: string;
  forhandsvis?: boolean;
}) {
  const [k, setK] = useState<KameraOffentlig>(start);
  const [hentetKl, setHentetKl] = useState<number>(() => Date.now());
  const [naa, setNaa] = useState<number>(() => Date.now());
  const [nettFeil, setNettFeil] = useState(false);
  const seer = useRef<string>('');

  const aapen = k.modus === 'demo' || k.modus === 'pa';

  const hent = useCallback(async () => {
    const sb = getBrowserClient();
    if (!sb) return;
    if (!seer.current) seer.current = seerId();
    try {
      const { data, error } = await sb.rpc('kamera_offentlig', { p_seer: seer.current });
      if (error || !data) {
        setNettFeil(true);
        return;
      }
      setK(tilOffentlig(data, supabaseUrl));
      setHentetKl(Date.now());
      setNettFeil(false);
    } catch {
      setNettFeil(true);
    }
  }, [supabaseUrl]);

  // Henter jevnlig – ofte når det er live, sjeldnere ellers. Stopper når fanen ikke vises.
  useEffect(() => {
    let tidtaker: number | undefined;
    let stoppet = false;
    const pause = () => {
      if (!aapen) return 60000;
      if (k.live) return Math.max(2, k.innst.oppdatering_sek) * 1000;
      return 10000;
    };
    const runde = async () => {
      if (stoppet) return;
      if (document.visibilityState === 'visible') await hent();
      if (!stoppet) tidtaker = window.setTimeout(runde, pause());
    };
    tidtaker = window.setTimeout(runde, pause());
    const synlig = () => {
      if (document.visibilityState === 'visible') {
        window.clearTimeout(tidtaker);
        runde();
      }
    };
    document.addEventListener('visibilitychange', synlig);
    return () => {
      stoppet = true;
      window.clearTimeout(tidtaker);
      document.removeEventListener('visibilitychange', synlig);
    };
  }, [hent, aapen, k.live, k.innst.oppdatering_sek]);

  // klokke til «oppdatert for x s siden»
  useEffect(() => {
    const t = window.setInterval(() => setNaa(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const alderSek =
    k.bilde_tid && k.naa
      ? Math.max(0, Math.round((Date.parse(k.naa) - Date.parse(k.bilde_tid)) / 1000 + (naa - hentetKl) / 1000))
      : null;

  if (!aapen) return <KommerSnart k={k} forhandsvis={forhandsvis} />;

  const I = k.innst;
  return (
    <div className="relative pb-24">
      <section className="container-x pt-10 sm:pt-14">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow">
            <span className={`h-1.5 w-1.5 rounded-full ${k.live ? 'bg-red-500' : 'bg-ink-300'}`} /> {I.fanenavn}
          </span>
          {k.modus === 'demo' && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-800">
              Demo · testfase
            </span>
          )}
        </div>
        <h1 className="mt-4 max-w-3xl text-balance text-4xl font-bold leading-[1.08] sm:text-5xl">{I.tittel}</h1>
        {I.ingress && <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-600">{I.ingress}</p>}

        {k.modus === 'demo' && I.demo_tekst && (
          <div className="mt-6 flex max-w-3xl items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0" aria-hidden>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
              <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>{I.demo_tekst}</span>
          </div>
        )}

        <Visning k={k} alderSek={alderSek} nettFeil={nettFeil} />

        <InfoKort k={k} />
      </section>

      {I.vis_forklaring && <Forklaring oppdatering={I.oppdatering_sek} />}

      {I.vis_timelapser && k.timelapser.length > 0 && (
        <section className="container-x mt-16">
          <h2 className="text-2xl font-bold sm:text-3xl">Timelapser av ferdige printer</h2>
          <p className="mt-2 max-w-2xl text-ink-600">Hele printen på noen sekunder – tatt opp av det samme kameraet.</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {k.timelapser.map((t) => (
              <figure key={t.id} className="card overflow-hidden p-2">
                <video
                  src={t.url}
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  className="aspect-video w-full rounded-2xl bg-ink-900 object-cover"
                />
                <figcaption className="flex items-center justify-between gap-3 px-2 pb-1 pt-3 text-sm">
                  <span className="truncate font-semibold text-ink-800">{t.navn || 'Timelapse'}</span>
                  <span className="shrink-0 text-ink-500">{t.sekunder ? `${t.sekunder} s` : ''}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {I.vis_bestill_knapp && <Bestill />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Selve bildet                                                         */
/* ------------------------------------------------------------------ */

function Visning({ k, alderSek, nettFeil }: { k: KameraOffentlig; alderSek: number | null; nettFeil: boolean }) {
  const ramme = useRef<HTMLDivElement>(null);
  const [vist, setVist] = useState<string | null>(k.bilde_url);
  const [kanFullskjerm, setKanFullskjerm] = useState(false);
  const [fullskjerm, setFullskjerm] = useState(false);

  // Laster neste bilde ferdig før det vises, så det aldri blinker
  useEffect(() => {
    if (!k.bilde_url) {
      setVist(null);
      return;
    }
    if (k.bilde_url === vist) return;
    let avbrutt = false;
    const img = new window.Image();
    img.onload = () => {
      if (!avbrutt) setVist(k.bilde_url);
    };
    img.src = k.bilde_url;
    return () => {
      avbrutt = true;
    };
  }, [k.bilde_url, vist]);

  useEffect(() => {
    setKanFullskjerm(!!document.fullscreenEnabled);
    const endret = () => setFullskjerm(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', endret);
    return () => document.removeEventListener('fullscreenchange', endret);
  }, []);

  const byttFullskjerm = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else ramme.current?.requestFullscreen().catch(() => {});
  };

  const I = k.innst;
  const p = k.printer;
  const live = k.live;
  const fremdrift = p?.fremdrift ?? null;
  const viserFremdrift = live && fremdrift !== null && fremdrift !== undefined && (p?.tilstand === 'RUNNING' || p?.tilstand === 'PAUSE');
  const detaljer = [
    viserFremdrift && p?.min_igjen !== null && p?.min_igjen !== undefined ? `${tidIgjen(p.min_igjen)} igjen` : '',
    viserFremdrift && p?.lag && p?.lag_totalt ? `lag ${p.lag} av ${p.lag_totalt}` : '',
    p?.dyse_temp !== null && p?.dyse_temp !== undefined ? `dyse ${Math.round(p.dyse_temp)}°` : '',
    p?.plate_temp !== null && p?.plate_temp !== undefined ? `plate ${Math.round(p.plate_temp)}°` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const visInfo = live && !!(k.print_navn || viserFremdrift || detaljer);

  return (
    <div className="mt-8">
      <div
        ref={ramme}
        className={`relative overflow-hidden bg-ink-950 shadow-lift ring-1 ring-ink-900/10 ${
          fullskjerm ? 'flex h-full w-full items-center justify-center' : 'aspect-video rounded-[1.75rem] sm:rounded-[2rem]'
        }`}
      >
        {vist ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vist}
            alt={live ? 'Live-bilde fra 3D-printeren' : 'Siste bilde fra 3D-printeren'}
            className={`h-full w-full object-contain transition-[filter] duration-700 ${live ? '' : 'grayscale brightness-[.55]'}`}
          />
        ) : (
          <PrinterTegning aktiv={false} className="h-full w-full opacity-60" />
        )}

        {/* oppe til venstre: LIVE / frakoblet */}
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2 sm:left-5 sm:top-5">
          {live ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold tracking-wide text-white shadow">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              LIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold tracking-wide text-white/90 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-ink-400" /> FRAKOBLET
            </span>
          )}
          {k.modus === 'demo' && (
            <span className="rounded-full bg-amber-400 px-2.5 py-1.5 text-[11px] font-bold tracking-wide text-amber-950">DEMO</span>
          )}
        </div>

        {/* oppe til høyre: klokke og seere */}
        <div className="absolute right-3 top-3 flex items-center gap-2 sm:right-5 sm:top-5">
          {live && k.seere !== null && k.seere > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
              {k.seere} ser på
            </span>
          )}
          {live && I.vis_klokke && k.bilde_tid && (
            <span className="rounded-full bg-black/55 px-3 py-1.5 font-mono text-xs font-semibold text-white backdrop-blur">
              {klokkeslett(k.bilde_tid)}
            </span>
          )}
          {kanFullskjerm && (
            <button
              type="button"
              onClick={byttFullskjerm}
              className="grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition-colors hover:bg-black/75"
              aria-label={fullskjerm ? 'Lukk fullskjerm' : 'Vis i fullskjerm'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d={fullskjerm ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>

        {/* frakoblet-melding midt i bildet */}
        {!live && (
          <div className="absolute inset-0 grid place-items-center p-6">
            <div className="max-w-md rounded-3xl bg-black/55 px-6 py-5 text-center text-white backdrop-blur-md">
              <p className="text-base font-semibold leading-snug sm:text-lg">{I.frakoblet_tekst}</p>
              {k.bilde_tid && vist && (
                <p className="mt-2 text-xs text-white/70">Siste bilde: {datoOgTid(k.bilde_tid)}</p>
              )}
            </div>
          </div>
        )}

        {/* nederst: hva som printes og hvor langt den har kommet */}
        {visInfo && (
          <div className="absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black/80 via-black/45 to-transparent px-6 pb-5 pt-12 text-white sm:block">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
                  {tilstandTekst(p?.tilstand)}
                </p>
                {k.print_navn && <p className="truncate text-base font-bold sm:text-xl">{k.print_navn}</p>}
              </div>
              <p className="text-sm font-semibold text-white/85">{detaljer}</p>
            </div>
            {viserFremdrift && (
              <div className="mt-2.5 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/25">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-200 transition-[width] duration-700"
                    style={{ width: `${Math.max(2, Math.min(100, Number(fremdrift)))}%` }}
                  />
                </div>
                <span className="w-11 text-right font-mono text-sm font-bold">{Math.round(Number(fremdrift))}%</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* på mobil: hva som printes vises under bildet, så bildet ikke dekkes */}
      {visInfo && (
        <div className="mt-3 rounded-2xl bg-ink-950 px-4 py-3.5 text-white sm:hidden">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">{tilstandTekst(p?.tilstand)}</p>
          {k.print_navn && <p className="truncate text-base font-bold">{k.print_navn}</p>}
          {detaljer && <p className="mt-0.5 text-xs font-semibold text-white/80">{detaljer}</p>}
          {viserFremdrift && (
            <div className="mt-2.5 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-200 transition-[width] duration-700"
                  style={{ width: `${Math.max(2, Math.min(100, Number(fremdrift)))}%` }}
                />
              </div>
              <span className="w-10 text-right font-mono text-sm font-bold">{Math.round(Number(fremdrift))}%</span>
            </div>
          )}
        </div>
      )}

      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
        {live && alderSek !== null && <span>Oppdatert for {alderSek < 2 ? 'et øyeblikk' : `${alderSek} sekunder`} siden</span>}
        {live && <span className="hidden sm:inline">·</span>}
        {live && <span>Nytt bilde omtrent hvert {k.innst.oppdatering_sek === 1 ? 'sekund' : `${k.innst.oppdatering_sek}. sekund`}</span>}
        {nettFeil && <span className="font-semibold text-amber-700">Mistet kontakten – prøver igjen …</span>}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function InfoKort({ k }: { k: KameraOffentlig }) {
  if (!k.print_navn && !k.print_beskrivelse) return null;
  return (
    <div className="card mt-6 p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">Dette printer vi nå</p>
      {k.print_navn && <h2 className="mt-1.5 text-xl font-bold sm:text-2xl">{k.print_navn}</h2>}
      {k.print_beskrivelse && <p className="mt-2 max-w-3xl leading-relaxed text-ink-600">{k.print_beskrivelse}</p>}
    </div>
  );
}

function Forklaring({ oppdatering }: { oppdatering: number }) {
  const steg = [
    ['Plasten smeltes', 'Printeren varmer opp plasttråd til rundt 220 grader og trykker den ut gjennom en tynn dyse.'],
    ['Lag for lag', 'Dysa tegner ett tynt lag om gangen – ofte bare 0,2 mm tykt – og bygger tingen nedenfra og opp.'],
    [
      'Kameraet ser alt',
      `Et kamera inne i printeren tar et nytt bilde omtrent hvert ${oppdatering === 1 ? 'sekund' : `${oppdatering}. sekund`}, og det havner rett her.`,
    ],
  ];
  return (
    <section className="container-x mt-16">
      <h2 className="text-2xl font-bold sm:text-3xl">Hva er det du ser på?</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {steg.map(([t, b], i) => (
          <div key={t} className="card p-5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
            <h3 className="mt-3 font-bold">{t}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{b}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Bestill() {
  return (
    <section className="container-x mt-16">
      <div className="flex flex-col items-start justify-between gap-5 rounded-[2rem] bg-gradient-to-br from-brand-600 to-brand-800 p-7 text-white shadow-lift sm:flex-row sm:items-center sm:p-10">
        <div>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Vil du at printeren skal lage noe til deg?</h2>
          <p className="mt-2 max-w-xl text-white/80">Velg noe fra galleriet, design ditt eget – eller fortell oss hva du trenger.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/bestill" className="btn px-6 py-3 font-bold" style={{ background: '#fff', color: '#1E47A3' }}>
            Bestill
          </Link>
          <Link href="/galleri" className="btn border border-white/40 px-6 py-3 hover:bg-white/10" style={{ color: '#fff' }}>
            Se galleriet
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Kommer snart                                                         */
/* ------------------------------------------------------------------ */

function KommerSnart({ k, forhandsvis }: { k: KameraOffentlig; forhandsvis: boolean }) {
  const I = k.innst;
  const punkter = [
    'Se printeren jobbe – helt live',
    'Følg med på hvor langt printen har kommet',
    'Timelapser av ferdige printer',
  ];
  return (
    <div className="relative pb-24">
      <section className="container-x pt-10 sm:pt-14">
        {forhandsvis && k.modus === 'skjult' && (
          <p className="mb-6 rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-700">
            Forhåndsvisning: siden er <b>skjult</b> for besøkende akkurat nå. Velg «Kommer snart», «Demo» eller «På» i admin for å vise den.
          </p>
        )}
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-800">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" /> Kommer snart
            </span>
            <h1 className="mt-4 text-balance text-4xl font-bold leading-[1.08] sm:text-5xl">{I.tittel}</h1>
            <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-ink-600">{I.kommer_snart_tekst}</p>
            <ul className="mt-6 space-y-3">
              {punkter.map((p) => (
                <li key={p} className="flex items-center gap-3 font-medium text-ink-800">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {p}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/galleri" className="btn-primary px-6 py-3">
                Se hva vi har printet
              </Link>
              <Link href="/bestill" className="btn-ghost px-6 py-3">
                Bestill noe
              </Link>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[2rem] shadow-lift ring-1 ring-ink-900/10">
            <PrinterTegning className="block aspect-video h-auto w-full" />
            <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold tracking-wide text-white backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> KOMMER SNART
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
