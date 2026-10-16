'use client';

/** Status fra Raspberry Pi-en og printeren, siste bilde og knapper som sender kommandoer. */
import { useState } from 'react';
import { useAdmin } from '../AdminProvider';
import {
  kameraUrl,
  tidIgjen,
  tilstandTekst,
  type KameraKommando,
  type KameraStatus,
} from '@/lib/kamera';
import { Kort } from './Kontroller';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

const KOMMANDOER: { kommando: string; tekst: string; hjelp: string }[] = [
  { kommando: 'ta_bilde', tekst: 'Ta bilde nå', hjelp: 'Laster opp ett bilde med en gang, også når kameraet er av' },
  { kommando: 'lys_pa', tekst: 'Lys på', hjelp: 'Slår på lyset inne i printeren' },
  { kommando: 'lys_av', tekst: 'Lys av', hjelp: 'Slår av lyset inne i printeren' },
  { kommando: 'start_timelapse', tekst: 'Start timelapse', hjelp: 'Begynner å ta opp en timelapse nå' },
  { kommando: 'stopp_timelapse', tekst: 'Stopp timelapse', hjelp: 'Avslutter og laster opp timelapsen' },
  { kommando: 'oppdater_status', tekst: 'Hent full status', hjelp: 'Ber printeren sende all status på nytt' },
  { kommando: 'omstart', tekst: 'Start Pi-programmet på nytt', hjelp: 'Hjelper ofte hvis noe har hengt seg opp' },
];

const KOMMANDO_NAVN: Record<string, string> = Object.fromEntries(KOMMANDOER.map((k) => [k.kommando, k.tekst]));

function sidenTekst(iso: string | null, naa: number): string {
  if (!iso) return 'aldri';
  const s = Math.max(0, Math.round((naa - Date.parse(iso)) / 1000));
  if (s < 5) return 'akkurat nå';
  if (s < 60) return `${s} s siden`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min siden`;
  const t = Math.round(m / 60);
  if (t < 48) return `${t} t siden`;
  return new Date(iso).toLocaleString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function Pille({ farge, children }: { farge: 'gronn' | 'gra' | 'rod' | 'gul'; children: React.ReactNode }) {
  const f = {
    gronn: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    gra: 'bg-ink-50 text-ink-600 ring-ink-200',
    rod: 'bg-red-50 text-red-700 ring-red-200',
    gul: 'bg-amber-50 text-amber-800 ring-amber-200',
  }[farge];
  const prikk = { gronn: 'bg-emerald-500', gra: 'bg-ink-400', rod: 'bg-red-500', gul: 'bg-amber-500' }[farge];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${f}`}>
      <span className={`h-2 w-2 rounded-full ${prikk}`} />
      {children}
    </span>
  );
}

function Verdi({ navn, verdi }: { navn: string; verdi: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-ink-50/70 px-3.5 py-2.5">
      <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-400">{navn}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-ink-800">{verdi}</dd>
    </div>
  );
}

export function KameraStatusPanel({
  status,
  kommandoer,
  naa,
  onSendt,
}: {
  status: KameraStatus | null;
  kommandoer: KameraKommando[];
  naa: number;
  onSendt: () => void;
}) {
  const { supabase, profile, user } = useAdmin();
  const [sender, setSender] = useState('');
  const [feil, setFeil] = useState('');

  const piPa = !!status?.sist_sett && naa - Date.parse(status.sist_sett) < 30000;
  const p = status?.printer ?? {};
  const pi = status?.pi ?? {};
  const bildeFersk = !!status?.siste_bilde_tid && naa - Date.parse(status.siste_bilde_tid) < 60000;

  async function send(kommando: string) {
    if (!supabase) return;
    setSender(kommando);
    setFeil('');
    const { error } = await supabase
      .from('kamera_kommandoer')
      .insert({ kommando, opprettet_av: profile?.name || user?.email || null });
    setSender('');
    if (error) setFeil('Klarte ikke å sende kommandoen. Prøv igjen.');
    else onSendt();
  }

  return (
    <Kort
      tittel="Status"
      beskrivelse="Oppdateres av seg selv hvert tredje sekund mens du er på denne siden."
      hoyre={
        <div className="flex flex-wrap gap-2">
          <Pille farge={piPa ? 'gronn' : 'gra'}>{piPa ? 'Pi-en er tilkoblet' : 'Pi-en er ikke tilkoblet'}</Pille>
          {piPa && (
            <Pille farge={p.tilkoblet === false ? 'rod' : 'gronn'}>
              {p.tilkoblet === false ? 'Finner ikke printeren' : `Printeren: ${tilstandTekst(p.tilstand).toLowerCase()}`}
            </Pille>
          )}
          {piPa && <Pille farge={status?.kamera_aktivt ? 'gronn' : 'gra'}>{status?.kamera_aktivt ? 'Kameraet sender' : 'Kameraet er av'}</Pille>}
          {status?.timelapse_pagar && <Pille farge="gul">Tar opp timelapse</Pille>}
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-ink-950">
            {status?.siste_bilde && SUPABASE_URL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={kameraUrl(status.siste_bilde, SUPABASE_URL)}
                alt="Siste bilde fra printeren"
                className={`h-full w-full object-contain ${bildeFersk ? '' : 'opacity-60 grayscale'}`}
              />
            ) : (
              <div className="grid h-full place-items-center px-6 text-center text-sm text-white/70">
                Ingen bilder ennå. Når Pi-en er koblet til, dukker det siste bildet opp her.
              </div>
            )}
            {status?.siste_bilde_tid && (
              <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                Siste bilde: {sidenTekst(status.siste_bilde_tid, naa)}
              </span>
            )}
          </div>
          <p className="hint">
            Pi-en sist hørt fra: <b>{sidenTekst(status?.sist_sett ?? null, naa)}</b>
          </p>
        </div>

        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-2">
            <Verdi navn="Fremdrift" verdi={p.fremdrift !== undefined ? `${Math.round(p.fremdrift)} %` : '–'} />
            <Verdi navn="Tid igjen" verdi={p.min_igjen !== undefined ? tidIgjen(p.min_igjen) || '–' : '–'} />
            <Verdi navn="Lag" verdi={p.lag !== undefined && p.lag_totalt ? `${p.lag} av ${p.lag_totalt}` : '–'} />
            <Verdi
              navn="Dyse"
              verdi={p.dyse_temp !== undefined ? `${Math.round(p.dyse_temp)}°${p.dyse_mal ? ` / ${Math.round(p.dyse_mal)}°` : ''}` : '–'}
            />
            <Verdi
              navn="Plate"
              verdi={p.plate_temp !== undefined ? `${Math.round(p.plate_temp)}°${p.plate_mal ? ` / ${Math.round(p.plate_mal)}°` : ''}` : '–'}
            />
            <Verdi navn="Lys i printeren" verdi={p.kammer_lys === undefined ? '–' : p.kammer_lys ? 'På' : 'Av'} />
            <div className="col-span-2">
              <Verdi navn="Fil (vises bare her i admin)" verdi={p.fil || '–'} />
            </div>
            <Verdi navn="Pi-temperatur" verdi={pi.temp !== undefined ? `${Math.round(pi.temp)}°` : '–'} />
            <Verdi navn="Ledig plass" verdi={pi.disk_ledig_mb !== undefined ? `${Math.round(pi.disk_ledig_mb / 1024 * 10) / 10} GB` : '–'} />
            <Verdi navn="Pi-programmet" verdi={pi.versjon ? `v${pi.versjon}` : '–'} />
            <Verdi navn="Wi-Fi (printer)" verdi={p.wifi || '–'} />
          </dl>
          {status?.feil && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              <b>Siste feil fra Pi-en:</b> {status.feil}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-ink-100 pt-5">
        <p className="label">Send kommando til Pi-en</p>
        <div className="flex flex-wrap gap-2">
          {KOMMANDOER.map((k) => (
            <button
              key={k.kommando}
              type="button"
              title={k.hjelp}
              disabled={!!sender}
              onClick={() => send(k.kommando)}
              className={`btn-sm ${k.kommando === 'omstart' ? 'btn-ghost' : 'btn-soft'} disabled:opacity-60`}
            >
              {sender === k.kommando ? 'Sender …' : k.tekst}
            </button>
          ))}
        </div>
        {!piPa && (
          <p className="hint">Pi-en er ikke tilkoblet nå. Kommandoer venter i 10 minutter før de gir opp.</p>
        )}
        {feil && <p className="mt-2 text-sm font-semibold text-red-600">{feil}</p>}

        {kommandoer.length > 0 && (
          <ul className="mt-4 divide-y divide-ink-100 rounded-2xl border border-ink-100">
            {kommandoer.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span className="font-semibold text-ink-800">{KOMMANDO_NAVN[k.kommando] ?? k.kommando}</span>
                <span className="flex items-center gap-2 text-xs text-ink-500">
                  {k.melding && <span className="max-w-[260px] truncate">{k.melding}</span>}
                  <span>{sidenTekst(k.opprettet, naa)}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-bold ${
                      k.status === 'ferdig'
                        ? 'bg-emerald-50 text-emerald-700'
                        : k.status === 'feilet'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-ink-100 text-ink-600'
                    }`}
                  >
                    {k.status === 'venter' ? 'Venter' : k.status === 'sendt' ? 'Sendt' : k.status === 'ferdig' ? 'Utført' : 'Feilet'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Kort>
  );
}
