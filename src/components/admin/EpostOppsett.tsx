'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAdmin } from './AdminProvider';

type SisteOrdre = {
  id: string;
  ordrenr: string | null;
  kunde: string | null;
  created_at: string;
  kilde: string | null;
  epost: string | null;
  epost_status: string | null;
};

type Status = {
  nokkel: boolean;
  avsender: string;
  testavsender: boolean;
  mottakere: string[];
  fraAnsatte: string[];
  fraInnstilling: string[];
  reserveBrukt: boolean;
  manglerKolonne: boolean;
  bedrift: string;
  siste: SisteOrdre[];
};

function Merke({ ok, tekst }: { ok: boolean; tekst: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
        ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
      }`}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`}
      />
      {tekst}
    </span>
  );
}

function Punkt({
  ok,
  tittel,
  children,
}: {
  ok: boolean;
  tittel: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3.5 border-t border-ink-100/70 py-4 first:border-t-0 first:pt-0">
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
          ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
        }`}
        aria-hidden
      >
        {ok ? '✓' : '!'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-900">{tittel}</p>
        <div className="mt-1 space-y-2 text-[13px] leading-relaxed text-ink-600">{children}</div>
      </div>
    </li>
  );
}

export function EpostOppsett() {
  const { supabase } = useAdmin();

  const [status, setStatus] = useState<Status | null>(null);
  const [laster, setLaster] = useState(true);
  const [til, setTil] = useState('');
  const [sender, setSender] = useState(false);
  const [svar, setSvar] = useState<{ ok: boolean; tekst: string } | null>(null);
  const [sendtPaNytt, setSendtPaNytt] = useState<Record<string, string>>({});

  const token = useCallback(async () => {
    if (!supabase) return '';
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? '';
  }, [supabase]);

  const hent = useCallback(async () => {
    setLaster(true);
    const res = await fetch('/api/epost', { headers: { Authorization: `Bearer ${await token()}` } });
    if (res.ok) setStatus(await res.json());
    setLaster(false);
  }, [token]);

  useEffect(() => {
    hent();
  }, [hent]);

  async function sendTest(e: React.FormEvent) {
    e.preventDefault();
    setSender(true);
    setSvar(null);
    const res = await fetch('/api/epost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ til }),
    });
    const data = await res.json().catch(() => ({}));
    setSender(false);
    if (data.ok) {
      setSvar({
        ok: true,
        tekst: `Sendt til ${(data.til as string[]).join(', ')}. Sjekk innboksen – og søppelpost.`,
      });
    } else {
      setSvar({ ok: false, tekst: data.feil || 'Klarte ikke å sende.' });
    }
  }

  async function sendPaNytt(o: SisteOrdre) {
    setSendtPaNytt((p) => ({ ...p, [o.id]: 'Sender …' }));
    const res = await fetch('/api/epost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ ordreId: o.id }),
    });
    const data = await res.json().catch(() => ({}));
    setSendtPaNytt((p) => ({
      ...p,
      [o.id]: data.ok ? `Sendt til ${(data.til as string[]).join(', ')}` : data.feil || 'Gikk ikke.',
    }));
    hent();
  }

  if (laster && !status) {
    return <div className="card p-6 text-sm text-ink-600">Sjekker oppsettet …</div>;
  }
  if (!status) {
    return <div className="card p-6 text-sm text-ink-600">Klarte ikke å hente statusen.</div>;
  }

  const alt = status.nokkel && status.mottakere.length > 0;

  return (
    <div className="space-y-5">
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100/70 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-ink-900">Får dere mail når noen bestiller?</h2>
            <p className="mt-0.5 text-[13px] text-ink-600">
              Her ser dere hva som mangler. Alt må være grønt.
            </p>
          </div>
          <Merke ok={alt} tekst={alt ? 'Klart' : 'Noe mangler'} />
        </div>

        <ul className="px-6 py-5">
          <Punkt ok={status.nokkel} tittel="Nøkkel fra Resend">
            {status.nokkel ? (
              <p>Nøkkelen ligger inne på serveren. Den delen er i orden.</p>
            ) : (
              <>
                <p>
                  Serveren har ingen nøkkel, så ingen e-post blir sendt i det hele tatt. Dette er
                  som regel grunnen til at det ikke kommer mail.
                </p>
                <p className="text-ink-500">
                  Lag en gratis konto på resend.com, lag en API-nøkkel, og legg den inn i Vercel
                  under Settings → Environment Variables med navnet{' '}
                  <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[11px]">
                    RESEND_API_KEY
                  </code>
                  . Trykk så Redeploy, ellers plukkes den ikke opp.
                </p>
              </>
            )}
          </Punkt>

          <Punkt ok={status.mottakere.length > 0} tittel="Hvem varselet går til">
            {status.mottakere.length > 0 ? (
              <>
                <p className="flex flex-wrap gap-1.5">
                  {status.mottakere.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-ink-100 px-2.5 py-1 font-mono text-[12px] text-ink-700"
                    >
                      {m}
                    </span>
                  ))}
                </p>
                {status.reserveBrukt && (
                  <p className="text-ink-500">
                    Ingen har huket av for varsel under Ansatte, så vi sender til alle som har lagt
                    inn e-post. Vil dere styre det selv, huk av på de rette under Ansatte.
                  </p>
                )}
              </>
            ) : (
              <p>
                Ingen adresser å sende til. Gå til Ansatte, skriv inn e-postadressene deres og huk av
                for varsel – eller legg inn en adresse under Kontakt og levering.
              </p>
            )}
            {status.manglerKolonne && (
              <p className="text-ink-500">
                Databasen mangler feltet for varsel. Kjør SQL-en i{' '}
                <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[11px]">
                  supabase/epost.sql
                </code>{' '}
                i Supabase.
              </p>
            )}
          </Punkt>

          <Punkt ok={!status.testavsender} tittel="Avsenderadresse">
            <p>
              Sendes fra{' '}
              <span className="font-mono text-[12px] text-ink-800">{status.avsender}</span>
            </p>
            {status.testavsender && (
              <p>
                Dette er Resend sin testadresse. Den kan{' '}
                <strong className="font-semibold text-ink-800">bare</strong> sende til adressen dere
                laget Resend-kontoen med. Bestiller noen andre, får kunden ingen kvittering.
                <br />
                Skal det virke for alle, må dere legge inn domenet deres i Resend under Domains, og
                deretter endre avsender her i admin til f.eks.{' '}
                <span className="font-mono text-[12px]">PrintFiksEB &lt;post@printfikseb.no&gt;</span>.
              </p>
            )}
          </Punkt>
        </ul>
      </div>

      <div className="card p-6">
        <h2 className="text-base font-bold text-ink-900">Prøv det</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-600">
          Send en test til deg selv. Kommer den ikke fram, står den nøyaktige feilmeldingen her
          under.
        </p>
        <form onSubmit={sendTest} className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <input
            type="email"
            value={til}
            onChange={(e) => setTil(e.target.value)}
            placeholder={status.mottakere[0] ?? 'din@epost.no'}
            className="field flex-1"
          />
          <button type="submit" className="btn-primary shrink-0" disabled={sender}>
            {sender ? 'Sender …' : 'Send test'}
          </button>
        </form>

        <AnimatePresence>
          {svar && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-3 rounded-xl px-4 py-3 text-sm font-medium ${
                svar.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
              }`}
            >
              {svar.tekst}
            </motion.p>
          )}
        </AnimatePresence>

        <button type="button" onClick={hent} className="btn-ghost btn-sm mt-4">
          Sjekk på nytt
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-ink-100/70 px-6 py-4">
          <h2 className="text-base font-bold text-ink-900">Siste bestillinger</h2>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-600">
            Her står det hva som faktisk skjedde med e-posten for hver bestilling. Står det ingenting,
            kom bestillingen inn før dette ble satt opp.
          </p>
        </div>

        {status.siste.length === 0 ? (
          <p className="px-6 py-6 text-sm text-ink-600">Ingen bestillinger ennå.</p>
        ) : (
          <ul className="divide-y divide-ink-100/70">
            {status.siste.map((o) => {
              const feilet = (o.epost_status ?? '').includes('feilet');
              const tomt = !o.epost_status;
              return (
                <li key={o.id} className="flex flex-wrap items-start gap-3 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      {o.ordrenr && (
                        <span className="rounded-full bg-ink-900 px-2 py-0.5 text-[11px] font-bold text-white">
                          #{o.ordrenr}
                        </span>
                      )}
                      <span className="font-semibold text-ink-900">{o.kunde || 'Uten navn'}</span>
                      {o.kilde === 'nett' && (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                          Fra nettsiden
                        </span>
                      )}
                      <span className="text-xs text-ink-400">
                        {new Date(o.created_at).toLocaleString('nb-NO', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </p>
                    <p
                      className={`mt-1 text-[13px] leading-relaxed ${
                        feilet ? 'text-red-700' : tomt ? 'text-ink-400' : 'text-ink-600'
                      }`}
                    >
                      {o.epost_status || 'Ingenting registrert'}
                    </p>
                    {sendtPaNytt[o.id] && (
                      <p className="mt-1 text-[13px] font-medium text-ink-800">{sendtPaNytt[o.id]}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => sendPaNytt(o)}
                    className="btn-ghost btn-sm shrink-0"
                  >
                    Send varsel på nytt
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
