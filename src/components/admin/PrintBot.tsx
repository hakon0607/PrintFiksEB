'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAdmin } from './AdminProvider';
import { Fremdrift } from './Fremdrift';

type Forslag = {
  id: string;
  hva?: string;
  type: string;
  nokkel?: string;
  ny_verdi?: string | number | boolean;
  for_verdi?: string;
  tittel?: string;
  ansvarlig_id?: string | null;
  ansvarlig_navn?: string | null;
  frist?: string | null;
  hastegrad?: string;
  materiale_id?: string;
  ny_pris_per_gram?: number;
  sporsmal?: string;
  svar_tekst?: string;
  produkt_id?: string;
  felt?: string;
  kunde?: string;
  hva_bestilt?: string;
  bestilling_pris?: number;
  bestilling_telefon?: string;
  bestilling_levering?: string;
  bestilling_frist?: string | null;
  status?: 'ny' | 'utfort' | 'avslatt' | 'feilet';
};

type Melding = {
  rolle: 'bruker' | 'bot';
  tekst: string;
  naviger?: string | null;
  forslag?: Forslag[];
};

const STARTFORSLAG = [
  'Hvor endrer jeg prisen på PLA?',
  'Før opp en bestilling fra Emma på en saksholder til 149 kr',
  'Hvordan legger jeg ut en ny modell?',
  'Hva må jeg gjøre for at endringene skal vises?',
];

function feltNavn(f: string) {
  if (f === 'price') return 'pris';
  if (f === 'active') return 'vises på nettsiden';
  if (f === 'featured') return 'vises på forsiden';
  return f;
}

export function PrintBotSamtale({
  full = false,
  onNavigert,
}: {
  full?: boolean;
  onNavigert?: () => void;
}) {
  const { supabase, profile, user } = useAdmin();
  const [meldinger, setMeldinger] = useState<Melding[]>([]);
  const [tekst, setTekst] = useState('');
  const [jobber, setJobber] = useState(false);
  const [feil, setFeil] = useState('');
  const bunnRef = useRef<HTMLDivElement>(null);
  const boksRef = useRef<HTMLDivElement>(null);
  // Var du nederst i samtalen da svaret kom? Bare da følger vi etter.
  const folgMed = useRef(true);

  function sjekkPosisjon() {
    const el = boksRef.current;
    if (!el) return;
    folgMed.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
  }

  useEffect(() => {
    const el = boksRef.current;
    if (!el || !folgMed.current) return;
    // Vi flytter bare selve samtaleboksen, aldri hele siden
    el.scrollTop = el.scrollHeight;
  }, [meldinger, jobber]);

  async function send(sporsmal?: string) {
    const innhold = (sporsmal ?? tekst).trim();
    if (!innhold || jobber || !supabase) return;

    folgMed.current = true;
    const nye: Melding[] = [...meldinger, { rolle: 'bruker', tekst: innhold }];
    setMeldinger(nye);
    setTekst('');
    setJobber(true);
    setFeil('');

    const { data } = await supabase.auth.getSession();
    const res = await fetch('/api/printbot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session?.access_token ?? ''}`,
      },
      body: JSON.stringify({
        meldinger: nye.map((m) => ({ rolle: m.rolle, tekst: m.tekst })),
      }),
    });

    const svar = await res.json().catch(() => ({}));
    setJobber(false);

    if (!res.ok) {
      setFeil(svar.error || 'PrintBot svarte ikke. Prøv igjen.');
      return;
    }

    setMeldinger((prev) => [
      ...prev,
      {
        rolle: 'bot',
        tekst: svar.svar,
        naviger: svar.naviger,
        forslag: (svar.forslag ?? []).map((f: Forslag) => ({ ...f, status: 'ny' as const })),
      },
    ]);
  }

  function settStatus(id: string, status: Forslag['status']) {
    setMeldinger((prev) =>
      prev.map((m) => ({
        ...m,
        forslag: m.forslag?.map((f) => (f.id === id ? { ...f, status } : f)),
      }))
    );
  }

  async function godkjenn(f: Forslag) {
    if (!supabase) return;
    let feilet = false;

    if (f.type === 'innstilling' && f.nokkel) {
      const { error } = await supabase
        .from('settings')
        .update({ value: String(f.ny_verdi ?? ''), updated_at: new Date().toISOString() })
        .eq('key', f.nokkel);
      feilet = !!error;
    } else if (f.type === 'materiale' && f.materiale_id) {
      const { error } = await supabase
        .from('materials')
        .update({ price_per_gram: Number(f.ny_pris_per_gram) })
        .eq('id', f.materiale_id);
      feilet = !!error;
    } else if (f.type === 'oppgave' && f.tittel) {
      const { error } = await supabase.from('tasks').insert({
        title: f.tittel,
        assigned_to: f.ansvarlig_id ?? null,
        due_date: f.frist || null,
        priority: ['lav', 'normal', 'hoy'].includes(String(f.hastegrad))
          ? String(f.hastegrad)
          : 'normal',
        created_by: profile?.name || user?.email || 'PrintBot',
      });
      feilet = !!error;
    } else if (f.type === 'faq' && f.sporsmal) {
      const { error } = await supabase
        .from('faq')
        .insert({ question: f.sporsmal, answer: f.svar_tekst ?? '', sort: 100 });
      feilet = !!error;
    } else if (f.type === 'bestilling' && f.kunde && f.hva_bestilt) {
      const { error } = await supabase.from('orders').insert({
        kunde: f.kunde,
        hva: f.hva_bestilt,
        telefon: f.bestilling_telefon ?? '',
        pris: Number(f.bestilling_pris) || 0,
        levering: f.bestilling_levering === 'Hjemlevering' ? 'Hjemlevering' : 'Henting',
        frist: f.bestilling_frist || null,
        status: 'ny',
        opprettet_av: profile?.name || user?.email || 'PrintBot',
      });
      feilet = !!error;
    } else if (f.type === 'produkt' && f.produkt_id && f.felt) {
      const verdi =
        f.felt === 'price' ? Number(f.ny_verdi) : f.ny_verdi === true || f.ny_verdi === 'true';
      const { error } = await supabase
        .from('products')
        .update({ [f.felt]: verdi })
        .eq('id', f.produkt_id);
      feilet = !!error;
    } else {
      feilet = true;
    }

    settStatus(f.id, feilet ? 'feilet' : 'utfort');
  }

  return (
    <div className={full ? 'flex min-h-[min(70vh,640px)] flex-col' : 'flex flex-1 flex-col overflow-hidden'}>
      {/* Samtale */}
      <div
        ref={boksRef}
        onScroll={sjekkPosisjon}
        className={`flex-1 space-y-4 overflow-y-auto overscroll-contain ${
          full ? 'max-h-[min(70vh,640px)] px-1 pb-4' : 'px-5 py-4'
        }`}
      >
        {meldinger.length === 0 && (
          <div>
            <p className="text-sm leading-relaxed text-ink-600">
              Hei{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}! Jeg kan hjelpe deg å
              finne fram i adminpanelet, svare på hvordan ting virker, og gjøre endringer for deg –
              som priser, oppgaver og spørsmål og svar.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-500">
              Jeg endrer aldri noe på egen hånd. Jeg spør deg først, viser nøyaktig hva som vil
              skje, og gjør det bare hvis du sier ja. Du trenger ikke spørre noen andre.
            </p>
            <div className={`mt-4 gap-2 ${full ? 'grid sm:grid-cols-2' : 'flex flex-col'}`}>
              {STARTFORSLAG.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-2xl border border-ink-200 bg-white px-4 py-2.5 text-left text-sm text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {meldinger.map((m, i) => (
          <div key={i} className={m.rolle === 'bruker' ? 'flex justify-end' : ''}>
            <div
              className={
                m.rolle === 'bruker'
                  ? 'max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-sm text-white'
                  : full
                    ? 'w-full max-w-3xl'
                    : 'w-full'
              }
            >
              <p
                className={
                  m.rolle === 'bruker'
                    ? ''
                    : 'whitespace-pre-wrap text-sm leading-relaxed text-ink-800'
                }
              >
                {m.tekst}
              </p>

              {m.rolle === 'bot' && m.naviger && (
                <Link href={m.naviger} onClick={onNavigert} className="btn-soft btn-sm mt-3">
                  Ta meg dit
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M5 12h14m0 0-5.5-5.5M19 12l-5.5 5.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              )}

              {m.rolle === 'bot' &&
                m.forslag?.map((f) => (
                  <div
                    key={f.id}
                    className={`mt-3 overflow-hidden rounded-2xl border ${
                      f.status === 'utfort'
                        ? 'border-emerald-200 bg-emerald-50'
                        : f.status === 'avslatt'
                          ? 'border-ink-200 bg-ink-50 opacity-60'
                          : f.status === 'feilet'
                            ? 'border-red-200 bg-red-50'
                            : 'border-amber-300 bg-amber-50'
                    }`}
                  >
                    <div className="px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-500">
                        PrintBot spør deg
                      </p>
                      <p className="mt-1 text-sm font-semibold text-ink-900">{f.hva}</p>

                      <div className="mt-2.5 space-y-1 text-[13px]">
                        {f.type === 'innstilling' && (
                          <Endring foer={f.for_verdi ?? ''} etter={String(f.ny_verdi ?? '')} />
                        )}
                        {f.type === 'materiale' && (
                          <Endring foer={f.for_verdi ?? ''} etter={`${f.ny_pris_per_gram} kr/g`} />
                        )}
                        {f.type === 'produkt' && (
                          <>
                            <p className="text-ink-500">Felt: {feltNavn(String(f.felt))}</p>
                            <Endring foer={f.for_verdi ?? ''} etter={String(f.ny_verdi ?? '')} />
                          </>
                        )}
                        {f.type === 'oppgave' && (
                          <ul className="space-y-0.5 text-ink-700">
                            <li>Oppgave: {f.tittel}</li>
                            {f.ansvarlig_navn && <li>Hvem: {f.ansvarlig_navn}</li>}
                            {f.frist && <li>Frist: {f.frist}</li>}
                          </ul>
                        )}
                        {f.type === 'faq' && (
                          <ul className="space-y-0.5 text-ink-700">
                            <li>Spørsmål: {f.sporsmal}</li>
                            {f.svar_tekst && <li>Svar: {f.svar_tekst}</li>}
                          </ul>
                        )}
                        {f.type === 'bestilling' && (
                          <ul className="space-y-0.5 text-ink-700">
                            <li>Kunde: {f.kunde}</li>
                            <li>Skal lages: {f.hva_bestilt}</li>
                            {!!f.bestilling_pris && <li>Pris: {f.bestilling_pris} kr</li>}
                            {f.bestilling_levering && <li>Levering: {f.bestilling_levering}</li>}
                            {f.bestilling_frist && <li>Frist: {f.bestilling_frist}</li>}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 border-t border-black/5 bg-white/60 px-4 py-2.5">
                      {f.status === 'ny' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => godkjenn(f)}
                            className="btn-primary btn-sm"
                          >
                            Ja, gjør det
                          </button>
                          <button
                            type="button"
                            onClick={() => settStatus(f.id, 'avslatt')}
                            className="btn-ghost btn-sm"
                          >
                            Nei, la det være
                          </button>
                        </>
                      ) : (
                        <span
                          className={`text-xs font-bold ${
                            f.status === 'utfort'
                              ? 'text-emerald-700'
                              : f.status === 'feilet'
                                ? 'text-red-700'
                                : 'text-ink-500'
                          }`}
                        >
                          {f.status === 'utfort'
                            ? 'Gjort ✓ Husk å publisere'
                            : f.status === 'feilet'
                              ? 'Klarte ikke å gjøre dette'
                              : 'Ikke gjort'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}

        {jobber && <Fremdrift aktiv tekst="PrintBot tenker…" ventetid={9000} />}

        {feil && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{feil}</p>
        )}

        <div ref={bunnRef} />
      </div>

      {/* Skrivefelt */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className={full ? 'pt-2' : 'border-t border-ink-100 bg-ink-50/60 p-3'}
      >
        <div className="flex gap-2">
          <input
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            placeholder="Spør om hva som helst…"
            className="field flex-1"
            aria-label="Melding til PrintBot"
          />
          <button
            type="submit"
            disabled={jobber || !tekst.trim()}
            className="btn-primary shrink-0 px-4"
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 12h15m0 0-6-6m6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

/** Liten boble nede til høyre, tilgjengelig fra alle sider i adminpanelet. */
export function PrintBot() {
  const [apen, setApen] = useState(false);

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setApen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-5 right-5 z-50 flex h-14 items-center gap-2.5 rounded-full bg-ink-900 pl-4 pr-5 text-white shadow-lift"
        aria-label="Åpne PrintBot"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500">
          <BotIkon />
        </span>
        <span className="text-sm font-semibold">PrintBot</span>
      </motion.button>

      <AnimatePresence>
        {apen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-24 right-5 z-50 flex max-h-[min(640px,calc(100vh-8rem))] w-[min(420px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-lift"
          >
            <div className="flex items-center gap-3 border-b border-ink-100 bg-ink-900 px-5 py-4 text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500">
                <BotIkon />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">PrintBot</p>
                <p className="text-[11px] text-ink-300">Spør alltid først – du bestemmer</p>
              </div>
              <Link
                href="/admin/printbot"
                onClick={() => setApen(false)}
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-ink-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                Åpne stor
              </Link>
              <button
                type="button"
                onClick={() => setApen(false)}
                className="rounded-full p-1.5 text-ink-300 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Lukk"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <PrintBotSamtale onNavigert={() => setApen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function BotIkon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="7" width="16" height="12" rx="3" stroke="white" strokeWidth="1.8" />
      <path d="M12 3v4M9 12.5h.01M15 12.5h.01" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M9.5 16h5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Endring({ foer, etter }: { foer: string; etter: string }) {
  return (
    <p className="flex flex-wrap items-center gap-2">
      <span className="rounded-lg bg-white px-2 py-1 font-mono text-ink-500 line-through">
        {foer || '(tomt)'}
      </span>
      <span className="text-ink-400">→</span>
      <span className="rounded-lg bg-white px-2 py-1 font-mono font-bold text-ink-900">
        {etter || '(tomt)'}
      </span>
    </p>
  );
}
