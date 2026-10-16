'use client';

/** Kobler Raspberry Pi-en til nettsiden: koblingsnøkkel, oppsettfil og installasjon. */
import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '../AdminProvider';
import { Kort } from './Kontroller';

type Info = { har_nokkel: boolean; opprettet: string | null; sist_brukt: string | null };

const dato = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–';

export function PiOppsett({ piTilkoblet }: { piTilkoblet: boolean }) {
  const { supabase } = useAdmin();
  const [info, setInfo] = useState<Info | null>(null);
  const [oppsett, setOppsett] = useState('');
  const [jobber, setJobber] = useState(false);
  const [feil, setFeil] = useState('');
  const [kopiert, setKopiert] = useState('');
  const [bekreft, setBekreft] = useState<'' | 'ny' | 'fjern'>('');
  const [side, setSide] = useState('');

  useEffect(() => setSide(window.location.origin), []);

  const kall = useCallback(
    async (handling: string) => {
      if (!supabase) return null;
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? '';
      const res = await fetch('/api/kamera/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ handling }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Noe gikk galt.');
      return json;
    },
    [supabase]
  );

  const hentInfo = useCallback(async () => {
    try {
      setInfo(await kall('info'));
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Noe gikk galt.');
    }
  }, [kall]);

  useEffect(() => {
    hentInfo();
    const t = window.setInterval(hentInfo, 30000);
    return () => window.clearInterval(t);
  }, [hentInfo]);

  async function lagNokkel() {
    setJobber(true);
    setFeil('');
    setBekreft('');
    try {
      const svar = await kall('ny_nokkel');
      setOppsett(svar.oppsett);
      await hentInfo();
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Noe gikk galt.');
    }
    setJobber(false);
  }

  async function fjern() {
    setJobber(true);
    setFeil('');
    setBekreft('');
    try {
      await kall('fjern_nokkel');
      setOppsett('');
      await hentInfo();
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Noe gikk galt.');
    }
    setJobber(false);
  }

  async function kopier(tekst: string, hva: string) {
    try {
      await navigator.clipboard.writeText(tekst);
      setKopiert(hva);
      window.setTimeout(() => setKopiert(''), 2000);
    } catch {
      setKopiert('');
    }
  }

  function lastNed() {
    const blob = new Blob([oppsett], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'printfiks-kamera.env';
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const installer = `curl -fsSL ${side || 'https://www.printfiks.org'}/kamera-pi/installer.sh | sudo bash`;

  return (
    <Kort
      tittel="Koble til Raspberry Pi"
      beskrivelse="Pi-en står ved siden av printeren på samme Wi-Fi. Den henter bildene fra kameraet i P1S-en og sender dem hit. Dette gjør du én gang."
      hoyre={
        info && (
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${
              piTilkoblet
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : info.har_nokkel
                  ? 'bg-amber-50 text-amber-800 ring-amber-200'
                  : 'bg-ink-50 text-ink-600 ring-ink-200'
            }`}
          >
            {piTilkoblet ? 'Tilkoblet' : info.har_nokkel ? 'Nøkkel laget – venter på Pi-en' : 'Ikke satt opp'}
          </span>
        )
      }
    >
      <ol className="space-y-6">
        <li>
          <p className="font-semibold text-ink-900">1. Lag en koblingsnøkkel</p>
          <p className="mt-1 text-sm text-ink-600">
            Nøkkelen er Pi-ens «passord» hit. Den vises bare én gang – lag en ny om du mister den (da slutter den gamle å
            virke).
          </p>
          {info?.har_nokkel && (
            <p className="mt-2 text-xs text-ink-500">
              Nåværende nøkkel laget {dato(info.opprettet)} · sist brukt {dato(info.sist_brukt)}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {bekreft === 'ny' ? (
              <>
                <span className="self-center text-sm font-semibold text-amber-800">Den gamle nøkkelen slutter å virke. Sikker?</span>
                <button type="button" onClick={lagNokkel} disabled={jobber} className="btn-primary btn-sm">
                  Ja, lag ny
                </button>
                <button type="button" onClick={() => setBekreft('')} className="btn-ghost btn-sm">
                  Avbryt
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => (info?.har_nokkel ? setBekreft('ny') : lagNokkel())}
                disabled={jobber}
                className="btn-primary btn-sm"
              >
                {jobber ? 'Lager …' : info?.har_nokkel ? 'Lag ny koblingsnøkkel' : 'Lag koblingsnøkkel'}
              </button>
            )}
            {info?.har_nokkel &&
              (bekreft === 'fjern' ? (
                <>
                  <button type="button" onClick={fjern} disabled={jobber} className="btn btn-sm border border-red-200 bg-white text-red-600 hover:bg-red-50">
                    Ja, koble fra
                  </button>
                  <button type="button" onClick={() => setBekreft('')} className="btn-ghost btn-sm">
                    Avbryt
                  </button>
                </>
              ) : (
                bekreft === '' && (
                  <button type="button" onClick={() => setBekreft('fjern')} className="btn-ghost btn-sm">
                    Koble fra Pi-en
                  </button>
                )
              ))}
          </div>

          {oppsett && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                Dette er oppsettet til Pi-en. Kopier det nå – nøkkelen vises ikke igjen.
              </p>
              <textarea
                readOnly
                value={oppsett}
                rows={10}
                className="mt-3 w-full resize-y rounded-xl border border-amber-200 bg-white p-3 font-mono text-xs text-ink-800"
                onFocus={(e) => e.currentTarget.select()}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => kopier(oppsett, 'oppsett')} className="btn-dark btn-sm">
                  {kopiert === 'oppsett' ? 'Kopiert ✓' : 'Kopier'}
                </button>
                <button type="button" onClick={lastNed} className="btn-ghost btn-sm">
                  Last ned som fil
                </button>
              </div>
            </div>
          )}
        </li>

        <li>
          <p className="font-semibold text-ink-900">2. Kjør installasjonen på Pi-en</p>
          <p className="mt-1 text-sm text-ink-600">
            Åpne Terminal på Pi-en (eller koble til med SSH) og lim inn denne linja. Den installerer alt som trengs og
            starter programmet av seg selv hver gang Pi-en skrus på.
          </p>
          <div className="mt-3 flex items-stretch gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-xl bg-ink-900 px-4 py-3 font-mono text-xs text-emerald-300">
              {installer}
            </code>
            <button type="button" onClick={() => kopier(installer, 'installer')} className="btn-dark btn-sm shrink-0">
              {kopiert === 'installer' ? 'Kopiert ✓' : 'Kopier'}
            </button>
          </div>
        </li>

        <li>
          <p className="font-semibold text-ink-900">3. Svar på spørsmålene</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-600">
            <li>Lim inn oppsettet fra steg 1 når installasjonen ber om det.</li>
            <li>
              <b>IP-adresse og tilgangskode</b> til printeren: på printerens skjerm, under innstillinger → nettverk (WLAN).
            </li>
            <li>
              <b>Serienummeret</b>: under innstillinger → enhet på printeren, eller i Bambu Studio / Bambu Handy.
            </li>
            <li>Tilgangskoden blir bare lagret på Pi-en – aldri her på nettsiden.</li>
          </ul>
        </li>

        <li>
          <p className="font-semibold text-ink-900">4. Ferdig</p>
          <p className="mt-1 text-sm text-ink-600">
            Status øverst blir grønn når Pi-en har kontakt. Sett så synligheten til «Demo» eller «På» når du vil at
            besøkende skal se bildet.
          </p>
        </li>
      </ol>

      {feil && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{feil}</p>}
    </Kort>
  );
}
