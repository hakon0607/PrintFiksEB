'use client';

/**
 * Adminsiden «Live kamera». Alle innstillinger lagres automatisk og gjelder med
 * en gang – både på nettsiden og på Raspberry Pi-en (den henter dem selv).
 */
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdmin } from '../AdminProvider';
import { StatusMerke } from '../TableEditor';
import {
  KAMERA_STANDARD,
  lesInnstillinger,
  type KameraInnstillinger,
  type KameraKommando,
  type KameraStatus,
  type Timelapse,
} from '@/lib/kamera';
import { Bryter, Dagvelger, Glider, Klokkefelt, Kort, Segment, Tekstfelt } from './Kontroller';
import { KameraStatusPanel } from './KameraStatus';
import { PiOppsett } from './PiOppsett';
import { TimelapseListe } from './Timelapser';

type Endre = <K extends keyof KameraInnstillinger>(nokkel: K, verdi: KameraInnstillinger[K]) => void;

export function KameraAdmin() {
  const { supabase, profile, user } = useAdmin();
  const [innst, setInnst] = useState<KameraInnstillinger | null>(null);
  const [status, setStatus] = useState<KameraStatus | null>(null);
  const [kommandoer, setKommandoer] = useState<KameraKommando[]>([]);
  const [timelapser, setTimelapser] = useState<Timelapse[]>([]);
  const [manglerSql, setManglerSql] = useState(false);
  const [lasteFeil, setLasteFeil] = useState('');
  const [lagring, setLagring] = useState<'' | 'lagrer' | 'lagret' | 'feil'>('');
  const [naa, setNaa] = useState(() => Date.now());

  const endringer = useRef<Partial<KameraInnstillinger>>({});
  const tidtaker = useRef<number | undefined>(undefined);
  const lagreRef = useRef<() => Promise<void>>(async () => {});

  /* ---------- henting ---------- */
  const hentInnstillinger = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('kamera_innstillinger').select('data').eq('id', 1).maybeSingle();
    if (error) {
      const melding = `${error.code ?? ''} ${error.message ?? ''}`;
      if (/42P01|PGRST205|kamera_innstillinger|does not exist|schema cache/i.test(melding)) setManglerSql(true);
      else setLasteFeil('Klarte ikke å hente innstillingene. Last siden på nytt.');
      return;
    }
    // ikke skriv over noe du holder på å endre
    if (Object.keys(endringer.current).length === 0) setInnst(lesInnstillinger(data?.data));
    else setInnst((f) => f ?? lesInnstillinger(data?.data));
  }, [supabase]);

  const hentStatus = useCallback(async () => {
    if (!supabase) return;
    const [s, k] = await Promise.all([
      supabase.from('kamera_status').select('*').eq('id', 1).maybeSingle(),
      supabase.from('kamera_kommandoer').select('*').order('id', { ascending: false }).limit(8),
    ]);
    if (!s.error && s.data) setStatus(s.data as KameraStatus);
    if (!k.error && k.data) setKommandoer(k.data as KameraKommando[]);
  }, [supabase]);

  const hentTimelapser = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('kamera_timelapser').select('*').order('opprettet', { ascending: false });
    if (!error && data) setTimelapser(data as Timelapse[]);
  }, [supabase]);

  useEffect(() => {
    hentInnstillinger();
    hentStatus();
    hentTimelapser();
    const a = window.setInterval(() => {
      if (document.visibilityState === 'visible') hentStatus();
    }, 3000);
    const b = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        hentInnstillinger();
        hentTimelapser();
      }
    }, 15000);
    const c = window.setInterval(() => setNaa(Date.now()), 1000);
    return () => {
      window.clearInterval(a);
      window.clearInterval(b);
      window.clearInterval(c);
    };
  }, [hentInnstillinger, hentStatus, hentTimelapser]);

  /* ---------- lagring ---------- */
  const lagre = useCallback(async () => {
    if (!supabase) return;
    const patch = endringer.current;
    if (!Object.keys(patch).length) return;
    endringer.current = {};
    // les det som ligger lagret nå (Pi-en kan ha endret noe), og legg endringene oppå
    const { data: naaLagret } = await supabase.from('kamera_innstillinger').select('data').eq('id', 1).maybeSingle();
    const ny = lesInnstillinger({ ...((naaLagret?.data as object) ?? {}), ...patch });
    const { error } = await supabase.from('kamera_innstillinger').upsert({
      id: 1,
      data: ny,
      oppdatert: new Date().toISOString(),
      oppdatert_av: profile?.name || user?.email || null,
    });
    if (error) {
      endringer.current = { ...patch, ...endringer.current };
      setLagring('feil');
      return;
    }
    setLagring('lagret');
    window.setTimeout(() => setLagring((s) => (s === 'lagret' ? '' : s)), 1600);
    // oppdater menyen på nettsiden med en gang
    const { data: okt } = await supabase.auth.getSession();
    fetch('/api/kamera/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${okt.session?.access_token ?? ''}` },
      body: JSON.stringify({ handling: 'oppdatert' }),
    }).catch(() => {});
  }, [supabase, profile?.name, user?.email]);

  lagreRef.current = lagre;

  const endre: Endre = (nokkel, verdi) => {
    setInnst((f) => (f ? { ...f, [nokkel]: verdi } : f));
    endringer.current = { ...endringer.current, [nokkel]: verdi };
    setLagring('lagrer');
    window.clearTimeout(tidtaker.current);
    tidtaker.current = window.setTimeout(() => lagreRef.current(), 600);
  };

  // lagre det som gjenstår hvis du går fra siden
  useEffect(() => {
    return () => {
      window.clearTimeout(tidtaker.current);
      lagreRef.current();
    };
  }, []);

  /* ---------- visning ---------- */
  if (manglerSql) return <ManglerSql />;
  if (lasteFeil) return <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{lasteFeil}</p>;
  if (!innst) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-3xl bg-white/70" />
        ))}
      </div>
    );
  }

  const piTilkoblet = !!status?.sist_sett && naa - Date.parse(status.sist_sett) < 30000;
  const I = innst;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Live kamera</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
            Vis kameraet i Bambu Lab P1S-en live på nettsiden. Alt her lagres automatisk og gjelder med en gang – du
            trenger ikke trykke Publiser.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusMerke status={lagring} />
          <Link href="/live?forhandsvis=1" target="_blank" className="btn-ghost btn-sm">
            Se siden
          </Link>
        </div>
      </div>

      {/* 1. synlighet */}
      <Kort
        tittel="Synlighet på nettsiden"
        beskrivelse="Velg hva besøkende ser. Du kan bytte når du vil – menyen oppdateres med en gang."
      >
        <Segment
          stor
          verdi={I.modus}
          onEndre={(v) => endre('modus', v)}
          valg={[
            { verdi: 'skjult', tekst: 'Skjult', under: 'Fanen og siden finnes ikke' },
            { verdi: 'kommer_snart', tekst: 'Kommer snart', under: 'Fanen vises med en «kommer snart»-side' },
            { verdi: 'demo', tekst: 'Demo', under: 'Live-bildet vises, merket som testfase' },
            { verdi: 'pa', tekst: 'På', under: 'Ferdig – live for alle' },
          ]}
        />
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Tekstfelt
            label="Navn på fanen i menyen"
            verdi={I.fanenavn}
            maks={30}
            plassholder="Live kamera"
            onEndre={(v) => endre('fanenavn', v)}
            hjelp="Kort er best, så det får plass på mobil."
          />
          <Bryter
            label="Vis fanen i menyen"
            verdi={I.vis_i_meny}
            onEndre={(v) => endre('vis_i_meny', v)}
            hjelp="Slår du av denne, finnes siden fortsatt på printfiks.org/live – den er bare ikke i menyen."
          />
        </div>
      </Kort>

      {/* 2. status */}
      <KameraStatusPanel status={status} kommandoer={kommandoer} naa={naa} onSendt={hentStatus} />

      {/* 3. når kameraet går */}
      <Kort
        tittel="Når skal kameraet gå?"
        beskrivelse="Dette styrer Pi-en. Når kameraet er av, sendes ingen bilder – og nettsiden viser at printeren hviler."
      >
        <Segment
          verdi={I.kamera_pa}
          onEndre={(v) => endre('kamera_pa', v)}
          valg={[
            { verdi: 'auto', tekst: 'Når printeren jobber', under: 'Starter og stopper av seg selv' },
            { verdi: 'pa', tekst: 'Alltid på', under: 'Også når printeren står stille' },
            { verdi: 'av', tekst: 'Av', under: 'Ingen bilder sendes' },
          ]}
        />
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <Glider
            label="Fortsett etter at printen er ferdig"
            verdi={I.vent_etter_print_min}
            min={0}
            maks={60}
            enhet=" min"
            onEndre={(v) => endre('vent_etter_print_min', v)}
            hjelp="Så folk rekker å se det ferdige resultatet. Gjelder «Når printeren jobber»."
          />
          <Bryter
            label="Bruk tidsplan"
            verdi={I.tidsplan_aktiv}
            onEndre={(v) => endre('tidsplan_aktiv', v)}
            hjelp="Utenfor tidene er kameraet alltid av, for eksempel om natta."
          />
        </div>
        {I.tidsplan_aktiv && (
          <div className="mt-5 grid gap-5 rounded-2xl bg-ink-50/60 p-4 sm:grid-cols-[1fr_1fr_2fr]">
            <Klokkefelt label="Fra kl." verdi={I.tidsplan_fra} onEndre={(v) => endre('tidsplan_fra', v)} />
            <Klokkefelt label="Til kl." verdi={I.tidsplan_til} onEndre={(v) => endre('tidsplan_til', v)} />
            <Dagvelger verdi={I.tidsplan_dager} onEndre={(v) => endre('tidsplan_dager', v)} />
          </div>
        )}
      </Kort>

      {/* 4. bildet */}
      <Bilde I={I} endre={endre} />

      {/* 5. det som vises over bildet */}
      <Kort
        tittel="Hva vises over bildet?"
        beskrivelse="Fremdrift og tid igjen kommer automatisk fra printeren. Navnet på printen skriver du selv, så filnavn med kundenavn aldri vises."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Tekstfelt
            label="Hva printes nå?"
            verdi={I.print_navn}
            maks={80}
            plassholder="F.eks. Spøkelse til Halloween"
            onEndre={(v) => endre('print_navn', v)}
          />
          <Bryter
            label="Tøm navnet når printen er ferdig"
            verdi={I.tom_navn_etter_print}
            onEndre={(v) => endre('tom_navn_etter_print', v)}
            hjelp="Da står det ikke feil navn når neste print starter."
          />
          <div className="sm:col-span-2">
            <Tekstfelt
              label="Litt om printen (valgfritt)"
              verdi={I.print_beskrivelse}
              maks={240}
              flerlinjet
              plassholder="F.eks. Printes i hvit PLA og tar rundt to timer."
              onEndre={(v) => endre('print_beskrivelse', v)}
            />
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Bryter label="Fremdrift i prosent" verdi={I.vis_fremdrift} onEndre={(v) => endre('vis_fremdrift', v)} />
          <Bryter label="Tid igjen" verdi={I.vis_tid_igjen} onEndre={(v) => endre('vis_tid_igjen', v)} />
          <Bryter label="Lag (f.eks. 30 av 120)" verdi={I.vis_lag} onEndre={(v) => endre('vis_lag', v)} />
          <Bryter label="Temperaturer" verdi={I.vis_temperaturer} onEndre={(v) => endre('vis_temperaturer', v)} />
          <Bryter label="Klokkeslett i bildet" verdi={I.vis_klokke} onEndre={(v) => endre('vis_klokke', v)} />
          <Bryter label="Hvor mange som ser på" verdi={I.vis_seere} onEndre={(v) => endre('vis_seere', v)} />
        </div>
      </Kort>

      {/* 6. tekster og deler av siden */}
      <Kort tittel="Tekster og innhold på siden" beskrivelse="La feltene stå tomme for å bruke standardteksten.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Tekstfelt label="Overskrift" verdi={I.tittel} maks={90} onEndre={(v) => endre('tittel', v)} />
          <Tekstfelt label="Ingress under overskriften" verdi={I.ingress} maks={300} flerlinjet onEndre={(v) => endre('ingress', v)} />
          <Tekstfelt
            label="Tekst når siden er «Kommer snart»"
            verdi={I.kommer_snart_tekst}
            maks={300}
            flerlinjet
            onEndre={(v) => endre('kommer_snart_tekst', v)}
          />
          <Tekstfelt label="Tekst i demo-modus" verdi={I.demo_tekst} maks={300} flerlinjet onEndre={(v) => endre('demo_tekst', v)} />
          <Tekstfelt
            label="Tekst når kameraet er av"
            verdi={I.frakoblet_tekst}
            maks={300}
            flerlinjet
            onEndre={(v) => endre('frakoblet_tekst', v)}
          />
          <div className="flex items-end">
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => {
                endre('tittel', KAMERA_STANDARD.tittel);
                endre('ingress', KAMERA_STANDARD.ingress);
                endre('kommer_snart_tekst', KAMERA_STANDARD.kommer_snart_tekst);
                endre('demo_tekst', KAMERA_STANDARD.demo_tekst);
                endre('frakoblet_tekst', KAMERA_STANDARD.frakoblet_tekst);
              }}
            >
              Bruk standardtekstene
            </button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Bryter
            label="Vis siste bilde når kameraet er av"
            verdi={I.vis_siste_bilde_nar_av}
            onEndre={(v) => endre('vis_siste_bilde_nar_av', v)}
            hjelp="Ellers vises en tegning av printeren."
          />
          <Bryter
            label="Vis «Hva er det du ser på?»"
            verdi={I.vis_forklaring}
            onEndre={(v) => endre('vis_forklaring', v)}
            hjelp="Kort forklaring av 3D-printing under bildet."
          />
          <Bryter label="Vis «Bestill»-boksen nederst" verdi={I.vis_bestill_knapp} onEndre={(v) => endre('vis_bestill_knapp', v)} />
          <Bryter
            label="Vis timelapser på siden"
            verdi={I.vis_timelapser}
            onEndre={(v) => endre('vis_timelapser', v)}
            hjelp="Bare de du har valgt «Vis på nettsiden» for."
          />
        </div>
      </Kort>

      {/* 7. timelapse */}
      <Kort
        tittel="Timelapse"
        beskrivelse="Pi-en tar et bilde med jevne mellomrom mens printeren jobber, og lager en kort video når printen er ferdig."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <Bryter label="Lag timelapse av hver print" verdi={I.timelapse_pa} onEndre={(v) => endre('timelapse_pa', v)} />
          <Glider
            label="Ett bilde hvert"
            verdi={I.timelapse_intervall_sek}
            min={2}
            maks={120}
            enhet=" s"
            onEndre={(v) => endre('timelapse_intervall_sek', v)}
            hjelp={`En print på 2 timer med bilde hvert ${I.timelapse_intervall_sek}. sekund blir ${Math.round(7200 / I.timelapse_intervall_sek)} bilder.`}
          />
          <Glider
            label="Bilder per sekund i videoen"
            verdi={I.timelapse_fps}
            min={10}
            maks={60}
            onEndre={(v) => endre('timelapse_fps', v)}
            hjelp={`${Math.round(7200 / I.timelapse_intervall_sek)} bilder i ${I.timelapse_fps} bilder/s gir en video på ${Math.round(7200 / I.timelapse_intervall_sek / I.timelapse_fps)} sekunder.`}
          />
          <Glider
            label="Behold maks"
            verdi={I.timelapse_maks}
            min={1}
            maks={100}
            enhet=" videoer"
            onEndre={(v) => endre('timelapse_maks', v)}
            hjelp="De eldste slettes automatisk når det kommer en ny."
          />
        </div>
        <div className="mt-6">
          <TimelapseListe liste={timelapser} onEndret={hentTimelapser} />
        </div>
      </Kort>

      {/* 8. koble til Pi */}
      <PiOppsett piTilkoblet={piTilkoblet} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Bilde({ I, endre }: { I: KameraInnstillinger; endre: Endre }) {
  const nullstill = () => {
    endre('roter', 0);
    endre('speil', false);
    endre('zoom', 1);
    endre('utsnitt_x', 50);
    endre('utsnitt_y', 50);
    endre('lysstyrke', 0);
    endre('kontrast', 0);
    endre('metning', 0);
    endre('skarphet', 0);
  };
  const pluss = (v: number) => (v > 0 ? `+${v}` : `${v}`);
  return (
    <Kort
      tittel="Bildet"
      beskrivelse="Pi-en gjør justeringene før bildet lastes opp. Se resultatet i «Status» etter noen sekunder."
      hoyre={
        <button type="button" onClick={nullstill} className="btn-ghost btn-sm">
          Nullstill justeringer
        </button>
      }
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <Glider
          label="Nytt bilde hvert"
          verdi={I.oppdatering_sek}
          min={1}
          maks={30}
          enhet=" s"
          onEndre={(v) => endre('oppdatering_sek', v)}
          hjelp="P1S-kameraet gir rundt 1–2 bilder i sekundet. 2–3 sekunder er et godt valg."
        />
        <Glider
          label="Bildekvalitet"
          verdi={I.kvalitet}
          min={40}
          maks={95}
          enhet=" %"
          onEndre={(v) => endre('kvalitet', v)}
          hjelp="Høyere gir skarpere bilde, men større filer."
        />
        <Segment
          label="Størrelse"
          verdi={I.maks_bredde}
          onEndre={(v) => endre('maks_bredde', v)}
          valg={[
            { verdi: 640, tekst: 'Liten', under: '640 px' },
            { verdi: 960, tekst: 'Middels', under: '960 px' },
            { verdi: 1280, tekst: 'Full', under: '1280 px' },
          ]}
        />
        <Segment
          label="Lyset inne i printeren"
          verdi={I.lys}
          onEndre={(v) => endre('lys', v)}
          valg={[
            { verdi: 'auto', tekst: 'Auto', under: 'På når kameraet går' },
            { verdi: 'pa', tekst: 'Alltid på' },
            { verdi: 'av', tekst: 'Ikke rør' },
          ]}
        />
        <Segment
          label="Roter bildet"
          verdi={I.roter}
          onEndre={(v) => endre('roter', v as KameraInnstillinger['roter'])}
          valg={[
            { verdi: 0, tekst: '0°' },
            { verdi: 90, tekst: '90°' },
            { verdi: 180, tekst: '180°' },
            { verdi: 270, tekst: '270°' },
          ]}
        />
        <Bryter label="Speilvend bildet" verdi={I.speil} onEndre={(v) => endre('speil', v)} />
        <Glider
          label="Zoom"
          verdi={I.zoom}
          min={1}
          maks={3}
          steg={0.1}
          visning={(v) => `${v.toFixed(1)}×`}
          onEndre={(v) => endre('zoom', Math.round(v * 10) / 10)}
          hjelp="Zoom inn på printeplata. Velg utsnittet med gliderne under."
        />
        <div className="grid gap-4">
          <Glider
            label="Utsnitt sideveis"
            verdi={I.utsnitt_x}
            min={0}
            maks={100}
            enhet=" %"
            onEndre={(v) => endre('utsnitt_x', v)}
          />
          <Glider
            label="Utsnitt opp/ned"
            verdi={I.utsnitt_y}
            min={0}
            maks={100}
            enhet=" %"
            onEndre={(v) => endre('utsnitt_y', v)}
            hjelp={I.zoom <= 1 ? 'Har bare virkning når zoom er over 1,0×.' : undefined}
          />
        </div>
        <Glider label="Lysstyrke" verdi={I.lysstyrke} min={-50} maks={50} visning={pluss} onEndre={(v) => endre('lysstyrke', v)} />
        <Glider label="Kontrast" verdi={I.kontrast} min={-50} maks={50} visning={pluss} onEndre={(v) => endre('kontrast', v)} />
        <Glider label="Farger" verdi={I.metning} min={-50} maks={50} visning={pluss} onEndre={(v) => endre('metning', v)} />
        <Glider label="Skarphet" verdi={I.skarphet} min={0} maks={100} onEndre={(v) => endre('skarphet', v)} />
      </div>
    </Kort>
  );
}

function ManglerSql() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Live kamera</h1>
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-amber-900">Én ting først: kjør SQL-en</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-amber-900">
          Live kamera trenger noen nye tabeller i databasen. Åpne Supabase → SQL Editor, lim inn hele fila{' '}
          <code className="rounded bg-white px-1.5 py-0.5">supabase/live-kamera.sql</code> og trykk Run. Last så denne
          siden på nytt.
        </p>
      </div>
    </div>
  );
}
