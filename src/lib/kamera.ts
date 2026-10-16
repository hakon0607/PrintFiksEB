/**
 * Live kamera – innstillinger og typer som deles av nettsiden, adminpanelet og
 * Raspberry Pi-programmet (som henter de samme innstillingene fra databasen).
 *
 * Standardverdiene her MÅ stemme med standardverdiene i supabase/live-kamera.sql
 * (funksjonen kamera_offentlig), ellers kan nettsiden og databasen vise ulikt.
 */

export type KameraModus = 'skjult' | 'kommer_snart' | 'demo' | 'pa';
export type NarPa = 'auto' | 'pa' | 'av';
export type LysValg = 'auto' | 'pa' | 'av';

export type KameraInnstillinger = {
  // synlighet
  modus: KameraModus;
  fanenavn: string;
  vis_i_meny: boolean;
  // når kameraet går (styres av Pi-en)
  kamera_pa: NarPa;
  vent_etter_print_min: number;
  tidsplan_aktiv: boolean;
  tidsplan_fra: string;
  tidsplan_til: string;
  tidsplan_dager: number[]; // 1 = mandag … 7 = søndag
  // bildet (behandles på Pi-en før det lastes opp)
  oppdatering_sek: number;
  kvalitet: number;
  maks_bredde: number;
  roter: 0 | 90 | 180 | 270;
  speil: boolean;
  zoom: number;
  utsnitt_x: number;
  utsnitt_y: number;
  lysstyrke: number;
  kontrast: number;
  metning: number;
  skarphet: number;
  lys: LysValg;
  // det som vises over bildet på nettsiden
  vis_fremdrift: boolean;
  vis_tid_igjen: boolean;
  vis_lag: boolean;
  vis_temperaturer: boolean;
  vis_klokke: boolean;
  vis_seere: boolean;
  print_navn: string;
  print_beskrivelse: string;
  tom_navn_etter_print: boolean;
  // tekster og deler av siden
  tittel: string;
  ingress: string;
  kommer_snart_tekst: string;
  demo_tekst: string;
  frakoblet_tekst: string;
  vis_siste_bilde_nar_av: boolean;
  vis_forklaring: boolean;
  vis_bestill_knapp: boolean;
  vis_timelapser: boolean;
  // timelapse
  timelapse_pa: boolean;
  timelapse_intervall_sek: number;
  timelapse_fps: number;
  timelapse_maks: number;
};

export const KAMERA_STANDARD: KameraInnstillinger = {
  modus: 'kommer_snart',
  fanenavn: 'Live kamera',
  vis_i_meny: true,

  kamera_pa: 'auto',
  vent_etter_print_min: 5,
  tidsplan_aktiv: false,
  tidsplan_fra: '08:00',
  tidsplan_til: '16:00',
  tidsplan_dager: [1, 2, 3, 4, 5],

  oppdatering_sek: 3,
  kvalitet: 80,
  maks_bredde: 1280,
  roter: 0,
  speil: false,
  zoom: 1,
  utsnitt_x: 50,
  utsnitt_y: 50,
  lysstyrke: 0,
  kontrast: 0,
  metning: 0,
  skarphet: 0,
  lys: 'auto',

  vis_fremdrift: true,
  vis_tid_igjen: true,
  vis_lag: true,
  vis_temperaturer: false,
  vis_klokke: true,
  vis_seere: false,
  print_navn: '',
  print_beskrivelse: '',
  tom_navn_etter_print: true,

  tittel: 'Se printeren vår live',
  ingress: 'Her ser du 3D-printeren vår mens den jobber – lag for lag, rett fra verkstedet på Sandsli.',
  kommer_snart_tekst: 'Snart kan du se 3D-printeren vår jobbe – helt live, rett her på nettsiden.',
  demo_tekst: 'Live-kameraet er i testfase. Bildet kan stoppe opp eller falle ut innimellom.',
  frakoblet_tekst: 'Printeren hviler akkurat nå. Kom tilbake senere for å se den jobbe!',
  vis_siste_bilde_nar_av: true,
  vis_forklaring: true,
  vis_bestill_knapp: true,
  vis_timelapser: true,

  timelapse_pa: true,
  timelapse_intervall_sek: 10,
  timelapse_fps: 25,
  timelapse_maks: 20,
};

const MODUSER: KameraModus[] = ['skjult', 'kommer_snart', 'demo', 'pa'];

const klamp = (v: unknown, min: number, maks: number, standard: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(maks, Math.max(min, n)) : standard;
};
const tekst = (v: unknown, standard: string, maks = 600) =>
  typeof v === 'string' ? v.slice(0, maks) : standard;
const sannUsann = (v: unknown, standard: boolean) => (typeof v === 'boolean' ? v : standard);
const klokke = (v: unknown, standard: string) =>
  typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : standard;
const valg = <T extends string>(v: unknown, lov: readonly T[], standard: T): T =>
  lov.includes(v as T) ? (v as T) : standard;

/** Gjør det som ligger i databasen om til gyldige innstillinger (ukjente/ugyldige verdier → standard). */
export function lesInnstillinger(raa: unknown): KameraInnstillinger {
  const r = (raa && typeof raa === 'object' ? raa : {}) as Record<string, unknown>;
  const S = KAMERA_STANDARD;
  const dager = Array.isArray(r.tidsplan_dager)
    ? Array.from(new Set(r.tidsplan_dager.map(Number).filter((d) => Number.isInteger(d) && d >= 1 && d <= 7))).sort()
    : S.tidsplan_dager;
  return {
    modus: valg(r.modus, MODUSER, S.modus),
    fanenavn: tekst(r.fanenavn, S.fanenavn, 30).trim() || S.fanenavn,
    vis_i_meny: sannUsann(r.vis_i_meny, S.vis_i_meny),

    kamera_pa: valg(r.kamera_pa, ['auto', 'pa', 'av'] as const, S.kamera_pa),
    vent_etter_print_min: Math.round(klamp(r.vent_etter_print_min, 0, 120, S.vent_etter_print_min)),
    tidsplan_aktiv: sannUsann(r.tidsplan_aktiv, S.tidsplan_aktiv),
    tidsplan_fra: klokke(r.tidsplan_fra, S.tidsplan_fra),
    tidsplan_til: klokke(r.tidsplan_til, S.tidsplan_til),
    tidsplan_dager: dager,

    oppdatering_sek: Math.round(klamp(r.oppdatering_sek, 1, 30, S.oppdatering_sek)),
    kvalitet: Math.round(klamp(r.kvalitet, 40, 95, S.kvalitet)),
    maks_bredde: [640, 960, 1280].includes(Number(r.maks_bredde)) ? Number(r.maks_bredde) : S.maks_bredde,
    roter: ([0, 90, 180, 270].includes(Number(r.roter)) ? Number(r.roter) : S.roter) as KameraInnstillinger['roter'],
    speil: sannUsann(r.speil, S.speil),
    zoom: Math.round(klamp(r.zoom, 1, 3, S.zoom) * 10) / 10,
    utsnitt_x: Math.round(klamp(r.utsnitt_x, 0, 100, S.utsnitt_x)),
    utsnitt_y: Math.round(klamp(r.utsnitt_y, 0, 100, S.utsnitt_y)),
    lysstyrke: Math.round(klamp(r.lysstyrke, -50, 50, S.lysstyrke)),
    kontrast: Math.round(klamp(r.kontrast, -50, 50, S.kontrast)),
    metning: Math.round(klamp(r.metning, -50, 50, S.metning)),
    skarphet: Math.round(klamp(r.skarphet, 0, 100, S.skarphet)),
    lys: valg(r.lys, ['auto', 'pa', 'av'] as const, S.lys),

    vis_fremdrift: sannUsann(r.vis_fremdrift, S.vis_fremdrift),
    vis_tid_igjen: sannUsann(r.vis_tid_igjen, S.vis_tid_igjen),
    vis_lag: sannUsann(r.vis_lag, S.vis_lag),
    vis_temperaturer: sannUsann(r.vis_temperaturer, S.vis_temperaturer),
    vis_klokke: sannUsann(r.vis_klokke, S.vis_klokke),
    vis_seere: sannUsann(r.vis_seere, S.vis_seere),
    print_navn: tekst(r.print_navn, S.print_navn, 80),
    print_beskrivelse: tekst(r.print_beskrivelse, S.print_beskrivelse, 240),
    tom_navn_etter_print: sannUsann(r.tom_navn_etter_print, S.tom_navn_etter_print),

    tittel: tekst(r.tittel, S.tittel, 90).trim() || S.tittel,
    ingress: tekst(r.ingress, S.ingress, 300).trim() || S.ingress,
    kommer_snart_tekst: tekst(r.kommer_snart_tekst, S.kommer_snart_tekst, 300).trim() || S.kommer_snart_tekst,
    demo_tekst: tekst(r.demo_tekst, S.demo_tekst, 300).trim() || S.demo_tekst,
    frakoblet_tekst: tekst(r.frakoblet_tekst, S.frakoblet_tekst, 300).trim() || S.frakoblet_tekst,
    vis_siste_bilde_nar_av: sannUsann(r.vis_siste_bilde_nar_av, S.vis_siste_bilde_nar_av),
    vis_forklaring: sannUsann(r.vis_forklaring, S.vis_forklaring),
    vis_bestill_knapp: sannUsann(r.vis_bestill_knapp, S.vis_bestill_knapp),
    vis_timelapser: sannUsann(r.vis_timelapser, S.vis_timelapser),

    timelapse_pa: sannUsann(r.timelapse_pa, S.timelapse_pa),
    timelapse_intervall_sek: Math.round(klamp(r.timelapse_intervall_sek, 2, 120, S.timelapse_intervall_sek)),
    timelapse_fps: Math.round(klamp(r.timelapse_fps, 10, 60, S.timelapse_fps)),
    timelapse_maks: Math.round(klamp(r.timelapse_maks, 1, 100, S.timelapse_maks)),
  };
}

/** Status som Pi-en melder inn (lagres i kamera_status). */
export type PrinterStatus = {
  tilstand?: string; // IDLE, PREPARE, RUNNING, PAUSE, FINISH, FAILED
  fremdrift?: number;
  min_igjen?: number;
  lag?: number;
  lag_totalt?: number;
  dyse_temp?: number;
  dyse_mal?: number;
  plate_temp?: number;
  plate_mal?: number;
  kammer_lys?: boolean;
  fil?: string; // bare i admin – vises aldri på nettsiden
  wifi?: string;
  tilkoblet?: boolean;
};

export type PiStatus = {
  versjon?: string;
  temp?: number;
  oppetid_min?: number;
  disk_ledig_mb?: number;
  ip?: string;
  kamera_tilkoblet?: boolean;
};

export type KameraStatus = {
  sist_sett: string | null;
  kamera_aktivt: boolean;
  siste_bilde: string | null;
  siste_bilde_tid: string | null;
  printer: PrinterStatus;
  pi: PiStatus;
  feil: string | null;
  timelapse_pagar: boolean;
};

export type KameraKommando = {
  id: number;
  kommando: string;
  status: 'venter' | 'sendt' | 'ferdig' | 'feilet';
  melding: string | null;
  opprettet: string;
  utfort: string | null;
  opprettet_av: string | null;
};

export type Timelapse = {
  id: number;
  sti: string;
  navn: string;
  sekunder: number;
  bilder: number;
  storrelse: number;
  vis: boolean;
  opprettet: string;
};

/** Det databasefunksjonen kamera_offentlig() gir tilbake (bare det som er trygt å vise). */
export type KameraOffentligRaa = {
  modus: KameraModus;
  live: boolean;
  naa: string | null;
  innst: Record<string, unknown>;
  bilde_sti: string | null;
  bilde_tid: string | null;
  print_navn: string | null;
  print_beskrivelse: string | null;
  printer: {
    tilstand?: string | null;
    fremdrift?: number | null;
    min_igjen?: number | null;
    lag?: number | null;
    lag_totalt?: number | null;
    dyse_temp?: number | null;
    plate_temp?: number | null;
  } | null;
  seere: number | null;
  timelapser: { id: number; sti: string; navn: string; sekunder: number; opprettet: string }[];
};

/** Det nettsiden bruker – med standardverdier fylt inn og ferdige lenker til bildene. */
export type KameraOffentlig = Omit<KameraOffentligRaa, 'innst' | 'bilde_sti' | 'timelapser'> & {
  innst: KameraInnstillinger;
  bilde_url: string | null;
  timelapser: { id: number; url: string; navn: string; sekunder: number; opprettet: string }[];
};

/** Brukes når databasen ikke svarer, eller SQL-en for live kamera ikke er kjørt ennå. */
export const KAMERA_SKJULT: KameraOffentlig = {
  modus: 'skjult',
  live: false,
  naa: null,
  innst: KAMERA_STANDARD,
  bilde_url: null,
  bilde_tid: null,
  print_navn: null,
  print_beskrivelse: null,
  printer: null,
  seere: null,
  timelapser: [],
};

/** Offentlig adresse til en fil i kamera-lagringen. */
export function kameraUrl(sti: string, supabaseUrl: string): string {
  const base = supabaseUrl.replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/kamera/${sti.split('/').map(encodeURIComponent).join('/')}`;
}

/** Gjør svaret fra databasen om til noe nettsiden kan bruke direkte. */
export function tilOffentlig(raa: unknown, supabaseUrl: string): KameraOffentlig {
  if (!raa || typeof raa !== 'object') return KAMERA_SKJULT;
  const r = raa as Partial<KameraOffentligRaa>;
  const modus: KameraModus = MODUSER.includes(r.modus as KameraModus) ? (r.modus as KameraModus) : 'skjult';
  return {
    modus,
    live: r.live === true,
    naa: r.naa ?? null,
    innst: lesInnstillinger({ ...(r.innst ?? {}), modus }),
    bilde_url: r.bilde_sti && supabaseUrl ? kameraUrl(r.bilde_sti, supabaseUrl) : null,
    bilde_tid: r.bilde_tid ?? null,
    print_navn: r.print_navn ?? null,
    print_beskrivelse: r.print_beskrivelse ?? null,
    printer: r.printer ?? null,
    seere: typeof r.seere === 'number' ? r.seere : null,
    timelapser: Array.isArray(r.timelapser)
      ? r.timelapser
          .filter((t) => t && typeof t.sti === 'string')
          .map((t) => ({ id: t.id, url: kameraUrl(t.sti, supabaseUrl), navn: t.navn || '', sekunder: t.sekunder || 0, opprettet: t.opprettet }))
      : [],
  };
}

/** Skal fanen vises i menyen? */
export function visIMeny(k: KameraOffentlig): boolean {
  return k.modus !== 'skjult' && k.innst.vis_i_meny;
}

export const KAMERA_BOTTE = 'kamera';
export const KAMERA_TAG = 'kamera';

/** Lesbare navn på printerens tilstand. */
export function tilstandTekst(t?: string | null): string {
  switch ((t || '').toUpperCase()) {
    case 'RUNNING':
      return 'Printer nå';
    case 'PREPARE':
    case 'SLICING':
      return 'Gjør klar';
    case 'PAUSE':
      return 'Pause';
    case 'FINISH':
      return 'Ferdig';
    case 'FAILED':
      return 'Stoppet';
    case 'IDLE':
      return 'Venter';
    default:
      return 'Ukjent';
  }
}

/** 95 → «1 t 35 min» */
export function tidIgjen(min?: number | null): string {
  if (min === null || min === undefined || !Number.isFinite(min)) return '';
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  const t = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${t} t ${r} min` : `${t} t`;
}
