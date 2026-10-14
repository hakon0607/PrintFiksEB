'use client';

/**
 * Tegn din pepperkakeform: tegn omrisset fritt på en 20 × 20 cm flate,
 * se formen i 3D og legg den i bestillingen. Prisen følger størrelsen.
 *
 * Streken kunden tegner er midtlinja i veggen. Flere streker kobles til én form
 * (en ny strek fester seg til enden av den forrige), og møtes endene lukkes den.
 */
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCart } from '@/lib/cart';
import { Ikon } from '@/components/deksel/Ikon';
import {
  glattUt, innenfor, kanLukkes, leggTil, lukk, naermesteEnde, renStrek, svgSti, SNAP_MM,
  type Form, type Pkt,
} from '@/lib/pepperkake/sti';
import { maal, MAKS_MM, MIN_CM2, pepperkakePris } from '@/lib/pepperkake/pris';
import { byggPepperkakeform } from '@/lib/pepperkake/nettleser';
import { PROFIL, type Nett } from '@/lib/pepperkake/modell';

const PepperkakeVisning = dynamic(() => import('./Visning').then((m) => m.PepperkakeVisning), {
  ssr: false,
  loading: () => <Laster tekst="Laster 3D …" />,
});

type Fase = 'tegn' | '3d' | 'bestill';
const TOM: Form = { punkter: [], lukket: false };
/** Magneten skal være lett å treffe med en finger: minst ~22 px på skjermen. */
const SNAP_PX = 22;

const cm = (mm: number) => (mm / 10).toFixed(1).replace('.', ',');

export function PepperkakeStudio({ produktNavn, standardPris }: { produktNavn: string; standardPris: number }) {
  const { add } = useCart();
  const [fase, setFase] = useState<Fase>('tegn');
  const [form, setForm] = useState<Form>(TOM);
  const fortid = useRef<Form[]>([]);
  const fremtid = useRef<Form[]>([]);
  const [melding, setMelding] = useState('');
  const [lagtTil, setLagtTil] = useState(false);

  /* ---------- tegning ---------- */
  const flate = useRef<SVGSVGElement>(null);
  const strek = useRef<{ id: number; punkter: Pkt[] } | null>(null);
  const [levende, setLevende] = useState<Pkt[]>([]);
  const [peker, setPeker] = useState<Pkt | null>(null);
  const rafRef = useRef(0);

  /** Snap-radius i mm: 7 mm, men aldri mindre enn ~22 px på skjermen. */
  const snapMm = useCallback(() => {
    const b = flate.current?.getBoundingClientRect().width || 600;
    return Math.max(SNAP_MM, (SNAP_PX * MAKS_MM) / b);
  }, []);

  function tilMm(e: { clientX: number; clientY: number }): Pkt {
    const r = flate.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * MAKS_MM;
    const y = ((e.clientY - r.top) / r.height) * MAKS_MM;
    return innenfor([Math.round(x * 100) / 100, Math.round(y * 100) / 100], MAKS_MM);
  }

  function visLevende() {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      setLevende(strek.current ? strek.current.punkter.slice() : []);
    });
  }
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  function settForm(ny: Form) {
    fortid.current.push(form);
    if (fortid.current.length > 60) fortid.current.shift();
    fremtid.current = [];
    setForm(ny);
    setLagtTil(false);
  }

  function ned(e: React.PointerEvent<SVGSVGElement>) {
    if (fase !== 'tegn' || strek.current) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (form.lukket) {
      setMelding('Formen er lukket. Trykk «Angre» eller «Start på nytt» for å endre den.');
      return;
    }
    e.preventDefault();
    try { flate.current?.setPointerCapture(e.pointerId); } catch { /* ikke støttet – tegner likevel */ }
    let p = tilMm(e);
    const ende = naermesteEnde(form, p);
    if (ende && ende.avstand <= snapMm()) p = ende.punkt; // start rett på enden
    strek.current = { id: e.pointerId, punkter: [p] };
    setMelding('');
    setPeker(p);
    visLevende();
  }

  function flytt(e: React.PointerEvent<SVGSVGElement>) {
    if (fase !== 'tegn') return;
    const s = strek.current;
    if (!s) {
      if (e.pointerType === 'mouse') setPeker(tilMm(e));
      return;
    }
    if (e.pointerId !== s.id) return;
    const hendelser = typeof e.nativeEvent.getCoalescedEvents === 'function' ? e.nativeEvent.getCoalescedEvents() : [];
    for (const h of hendelser.length ? hendelser : [e.nativeEvent]) s.punkter.push(tilMm(h));
    setPeker(s.punkter[s.punkter.length - 1]);
    visLevende();
  }

  function opp(e: React.PointerEvent<SVGSVGElement>) {
    const s = strek.current;
    if (!s || e.pointerId !== s.id) return;
    strek.current = null;
    setLevende([]);
    if (e.pointerType !== 'mouse') setPeker(null);
    const ren = renStrek(s.punkter);
    if (ren.length < 2) return;
    const ny = leggTil(form, ren, snapMm());
    if (ny !== form) settForm(ny);
  }

  function angre() {
    const forrige = fortid.current.pop();
    if (!forrige) return;
    fremtid.current.push(form);
    setForm(forrige);
    setMelding('');
    setLagtTil(false);
  }
  function gjenta() {
    const neste = fremtid.current.pop();
    if (!neste) return;
    fortid.current.push(form);
    setForm(neste);
    setLagtTil(false);
  }
  function nullstill() {
    if (!form.punkter.length) return;
    settForm(TOM);
    setMelding('');
  }

  useEffect(() => {
    if (fase !== 'tegn') return;
    const tast = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) gjenta(); else angre(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); gjenta(); }
    };
    window.addEventListener('keydown', tast);
    return () => window.removeEventListener('keydown', tast);
  });

  /* ---------- mål og pris ---------- */
  const m = useMemo(() => maal(form.punkter), [form]);
  const forLiten = form.punkter.length > 1 && m.arealCm2 < MIN_CM2;
  const tom = form.punkter.length < 2;
  const pris = pepperkakePris(m.arealCm2, standardPris);
  const kanVidere = !tom && !forLiten;

  /* ---------- 3D ---------- */
  const nokkel = useMemo(() => JSON.stringify(form), [form]);
  const [modell, setModell] = useState<{ nokkel: string; nett: Nett } | null>(null);
  const [bygger, setBygger] = useState(false);
  const [byggFeil, setByggFeil] = useState('');
  useEffect(() => {
    if (fase === 'tegn' || !kanVidere || modell?.nokkel === nokkel) return;
    let avbrutt = false;
    setBygger(true);
    setByggFeil('');
    byggPepperkakeform(form)
      .then((r) => { if (!avbrutt) setModell({ nokkel, nett: r.nett }); })
      .catch((e) => { if (!avbrutt) setByggFeil(e instanceof Error ? e.message : 'Ukjent feil'); })
      .finally(() => { if (!avbrutt) setBygger(false); });
    return () => { avbrutt = true; };
  }, [fase, nokkel, kanVidere, form, modell?.nokkel]);

  /* ---------- steg ---------- */
  const studioRef = useRef<HTMLDivElement>(null);
  function gaTil(ny: Fase) {
    if (ny !== 'tegn' && !kanVidere) return;
    setFase(ny);
    setMelding('');
    if (!window.matchMedia('(min-width: 1024px)').matches) {
      // mobil: vis studioet med en gang, akkurat som man ser det på PC
      requestAnimationFrame(() => studioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  function leggIBestilling() {
    if (!kanVidere) return;
    add({
      kind: 'pepperkake',
      qty: 1,
      title: `Pepperkakeform ${cm(m.bredde)} × ${cm(m.hoyde)} cm`,
      price: pris,
      punkter: form.punkter,
      lukket: form.lukket,
      bredde: Math.round(m.bredde * 10) / 10,
      hoyde: Math.round(m.hoyde * 10) / 10,
    });
    setLagtTil(true);
  }

  /* ---------- visning ---------- */
  const sti = useMemo(() => svgSti(form), [form]);
  const levSti = levende.length > 1 ? svgSti({ punkter: levende, lukket: false }) : '';
  const ender: Pkt[] = !form.lukket && form.punkter.length ? [form.punkter[0], form.punkter[form.punkter.length - 1]] : [];
  const snap = typeof window === 'undefined' ? SNAP_MM : snapMm();
  const naerEnde = peker && fase === 'tegn' ? naermesteEnde(form, peker) : null;
  const magnet = naerEnde && naerEnde.avstand <= snap ? naerEnde.punkt : null;
  // lukker streken som tegnes nå formen? (starten av streken nær den andre enden)
  const levStart = levende[0];

  const linjer: React.ReactNode[] = [];
  for (let i = 10; i < MAKS_MM; i += 10) {
    const hel = i % 50 === 0;
    linjer.push(
      <line key={`x${i}`} x1={i} y1={0} x2={i} y2={MAKS_MM} stroke={hel ? '#cbd5e1' : '#e2e8f0'} strokeWidth={hel ? 0.45 : 0.3} />,
      <line key={`y${i}`} x1={0} y1={i} x2={MAKS_MM} y2={i} stroke={hel ? '#cbd5e1' : '#e2e8f0'} strokeWidth={hel ? 0.45 : 0.3} />
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start [touch-action:manipulation] [overflow-anchor:none]">
      {/* ================= Studioet ================= */}
      <div className="min-w-0 lg:sticky lg:top-24" ref={studioRef} style={{ scrollMarginTop: 72 }}>
        <div className="studio px-3 pb-4 pt-12 sm:px-6">
          <div className="studio-rutenett" />
          <span className="studio-hjorne left-3 top-3 border-l border-t" />
          <span className="studio-hjorne right-3 top-3 border-r border-t" />
          <span className="studio-hjorne bottom-3 left-3 border-b border-l" />
          <span className="studio-hjorne bottom-3 right-3 border-b border-r" />

          {/* HUD */}
          <div className="studio-hud pointer-events-none absolute inset-x-5 top-4 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className={`studio-prikk ${bygger ? 'opptatt' : ''}`} />
              {fase === 'tegn' ? 'Pepperkakestudio' : bygger ? 'Bygger 3D-modell' : 'Din pepperkakeform'}
            </span>
            <span>
              {tom ? <>tegneflate <b>20 × 20 cm</b></> : <><b>{cm(m.bredde)} × {cm(m.hoyde)} cm</b> · {pris} kr</>}
            </span>
          </div>

          <div className="relative">
            {fase === 'tegn' ? (
              <div className="relative mx-auto w-full max-w-[620px]">
                <svg
                  ref={flate}
                  viewBox={`0 0 ${MAKS_MM} ${MAKS_MM}`}
                  className="block aspect-square w-full cursor-crosshair select-none rounded-2xl bg-white shadow-[0_0_0_1px_rgba(103,232,249,.35),0_20px_60px_-20px_rgba(34,211,238,.35)]"
                  style={{ touchAction: 'none' }}
                  onPointerDown={ned}
                  onPointerMove={flytt}
                  onPointerUp={opp}
                  onPointerCancel={opp}
                  onPointerLeave={(e) => { if (e.pointerType === 'mouse' && !strek.current) setPeker(null); }}
                  role="img"
                  aria-label="Tegneflate, 20 × 20 cm"
                >
                  {linjer}
                  {/* veggen og kanten formen får – så man ser hvor bred den blir */}
                  {sti && (
                    <path d={sti} fill={form.lukket ? '#e9b97a' : 'none'} fillOpacity={0.35}
                      stroke="#22d3ee" strokeOpacity={0.16} strokeWidth={PROFIL.flensRadius * 2}
                      strokeLinejoin="round" strokeLinecap="round" />
                  )}
                  {sti && (
                    <path d={sti} fill="none" stroke="#0f172a" strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round" />
                  )}
                  {levSti && (
                    <path d={levSti} fill="none" stroke="#0891b2" strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round" />
                  )}
                  {/* endene man kan koble videre fra */}
                  {ender.map((p, i) => (
                    <g key={i}>
                      <circle cx={p[0]} cy={p[1]} r={snap} fill="#22d3ee" fillOpacity={magnet === p ? 0.22 : 0.08}
                        stroke="#06b6d4" strokeOpacity={magnet === p ? 0.9 : 0.35} strokeWidth={0.5} strokeDasharray={magnet === p ? undefined : '1.6 1.2'} />
                      <circle cx={p[0]} cy={p[1]} r={1.6} fill="#06b6d4" stroke="#fff" strokeWidth={0.6} />
                    </g>
                  ))}
                  {levStart && levende.length > 1 && !form.punkter.length && (() => {
                    // første strek: vis at den lukkes hvis du kommer tilbake til start
                    const slutt = levende[levende.length - 1];
                    const naer = Math.hypot(slutt[0] - levStart[0], slutt[1] - levStart[1]) <= snap && levende.length > 12;
                    return (
                      <circle cx={levStart[0]} cy={levStart[1]} r={snap} fill="#22d3ee" fillOpacity={naer ? 0.22 : 0.06}
                        stroke="#06b6d4" strokeOpacity={naer ? 0.9 : 0.3} strokeWidth={0.5} strokeDasharray={naer ? undefined : '1.6 1.2'} />
                    );
                  })()}
                  {levStart && levende.length > 1 && <circle cx={levStart[0]} cy={levStart[1]} r={1.3} fill="#0891b2" />}
                </svg>
                {tom && !levende.length && (
                  <div className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center">
                    <div>
                      <p className="text-base font-bold text-ink-700">Tegn omrisset av pepperkaka</p>
                      <p className="mt-1 text-sm text-ink-500">Med fingeren eller musa · rutene er 1 × 1 cm</p>
                    </div>
                  </div>
                )}
              </div>
            ) : modell && modell.nokkel === nokkel ? (
              <PepperkakeVisning nett={modell.nett} />
            ) : byggFeil ? (
              <div className="grid aspect-square w-full place-items-center px-6 text-center">
                <p className="text-sm text-red-300">Klarte ikke å lage 3D-modellen: {byggFeil}</p>
              </div>
            ) : (
              <Laster tekst="Bygger 3D-modell …" />
            )}
          </div>

          <p className="studio-hud pointer-events-none mt-2 min-h-4 text-center !normal-case !tracking-normal">
            {fase === 'tegn'
              ? melding || (form.lukket ? <>Formen er <b>lukket</b> ✓</> : tom ? 'Tips: tegn sakte – streken glattes ut automatisk' : 'Fortsett fra en av de blå endene, eller trekk streken tilbake til start for å lukke formen')
              : 'Dra for å snu formen · kanten øverst er den du trykker på'}
          </p>

          {/* verktøylinje */}
          {fase === 'tegn' && (
            <div className="relative mt-3 flex flex-wrap items-center justify-center gap-2">
              <div className="studio-verktoy max-w-full [&_button]:whitespace-nowrap max-sm:!gap-0.5 max-sm:[&_.studio-skille]:hidden max-sm:[&_button]:!px-2" role="group" aria-label="Verktøy">
                <button type="button" onClick={angre} disabled={!fortid.current.length} aria-label="Angre" title="Angre (Ctrl+Z)">
                  <Ikon navn="angre" /><span className="hidden sm:inline">Angre</span>
                </button>
                <button type="button" onClick={gjenta} disabled={!fremtid.current.length} aria-label="Gjør om" title="Gjør om (Ctrl+Y)">
                  <Ikon navn="gjenta" />
                </button>
                <span className="studio-skille" />
                <button type="button" onClick={() => settForm(glattUt(form))} disabled={form.punkter.length < 3} title="Gjør linjene jevnere – trykk flere ganger for mer">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M3 15c3-6 5-6 7-3s4 3 7-3M3 20c3-4 6-4 9-2s6 2 9-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  Glatt ut
                </button>
                <span className="studio-skille" />
                <button type="button" onClick={() => settForm(lukk(form))} disabled={!kanLukkes(form)} aria-label="Lukk formen" title="Koble endene sammen med en rett strek">
                  <Ikon navn="fyll" /><span className="sm:hidden">Lukk</span><span className="hidden sm:inline">Lukk formen</span>
                </button>
                <span className="studio-skille" />
                <button type="button" onClick={nullstill} disabled={tom} aria-label="Start på nytt" title="Visk ut alt">
                  <Ikon navn="soppel" /><span className="sm:hidden">Tøm</span><span className="hidden sm:inline">Start på nytt</span>
                </button>
              </div>
            </div>
          )}
          {fase !== 'tegn' && (
            <div className="relative mt-3 flex justify-center">
              <div className="studio-verktoy" role="group">
                <button type="button" onClick={() => gaTil('tegn')}><Ikon navn="blyant" />Endre tegningen</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= Valg ================= */}
      <div className="min-w-0 space-y-4">
        <Stegviser fase={fase} kan={kanVidere} onGa={gaTil} />

        {fase === 'tegn' && (
          <Steg nr={1} tittel="Tegn formen">
            <ul className="space-y-1.5 text-sm leading-relaxed text-ink-600">
              <li>• Tegn <b>omrisset</b> av kaka – streken blir kanten som skjærer.</li>
              <li>• Du kan tegne med flere streker. En ny strek fester seg til <b>enden</b> av den forrige (den blå ringen lyser når du er nær).</li>
              <li>• Når endene møtes, <b>lukkes</b> formen.</li>
              <li>• Ble streken ujevn? Trykk <b>«Glatt ut»</b> – flere ganger for jevnere linjer.</li>
              <li>• Størrelsen er så stor som du tegner – opptil 20 × 20 cm.</li>
            </ul>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Tall etikett="Størrelse" verdi={tom ? '–' : `${cm(m.bredde)} × ${cm(m.hoyde)} cm`} />
              <Tall etikett="Pris" verdi={tom ? '–' : `${pris} kr`} sterk />
            </div>

            {!tom && !form.lukket && !forLiten && (
              <div className="mt-3 flex gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-900">
                <span className="mt-0.5 h-fit shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Åpen</span>
                <p>
                  Formen er ikke lukket, så kaka får ikke hel kant der det er åpent. Du kan fortsatt bestille –
                  eller trykk <b>«Lukk formen»</b> for å koble endene.
                </p>
              </div>
            )}
            {forLiten && (
              <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] leading-relaxed text-red-800">
                Formen er for liten. Tegn den minst ca. {MIN_CM2} cm² (f.eks. 3,2 × 3,2 cm), så den blir sterk nok og lett å bruke.
              </p>
            )}

            <button type="button" onClick={() => gaTil('3d')} disabled={!kanVidere} className="btn-primary mt-4 w-full py-3 text-base disabled:opacity-50">
              {tom ? 'Tegn formen først' : 'Neste: se den i 3D'} {!tom && <Pil />}
            </button>
          </Steg>
        )}

        {fase === '3d' && (
          <Steg nr={2} tittel="Se formen i 3D">
            <p className="text-sm leading-relaxed text-ink-600">
              Slik blir pepperkakeformen din. Kaka får samme form som du tegnet.
            </p>
            <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-ink-600">
              <li>• <b>{cm(m.bredde)} × {cm(m.hoyde)} cm</b>, {PROFIL.hoyde} mm høy, i hvit</li>
              <li>• Bred, tykk kant på toppen – du kan trykke hardt uten at det gjør vondt</li>
              <li>• Veggen er forsterket nederst så den ikke knekker, og har en skarp kant ytterst som skjærer rent</li>
            </ul>
            {!form.lukket && (
              <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-900">
                Husk: formen er åpen.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => gaTil('tegn')} className="btn-ghost">
                <Pil tilbake /> Tegningen
              </button>
              <button type="button" onClick={() => gaTil('bestill')} className="btn-primary flex-1">
                Neste: bestill <Pil />
              </button>
            </div>
          </Steg>
        )}

        {fase === 'bestill' && (
          <Steg nr={3} tittel="Pris og bestilling">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-ink-600">Størrelse</dt><dd className="font-semibold">{cm(m.bredde)} × {cm(m.hoyde)} cm</dd></div>
              <div className="flex justify-between"><dt className="text-ink-600">Farge</dt><dd className="font-semibold">Hvit</dd></div>
              <div className="flex justify-between"><dt className="text-ink-600">Form</dt><dd className="font-semibold">{form.lukket ? 'Lukket' : 'Åpen'}</dd></div>
              <div className="flex justify-between border-t border-ink-100 pt-2 text-base"><dt className="font-bold">Pris</dt><dd className="font-bold text-brand-700">{pris} kr</dd></div>
            </dl>
            <p className="mt-2 text-xs text-ink-500">7 × 7 cm koster {standardPris} kr – prisen følger størrelsen, avrundet til nærmeste 5 kr.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={leggIBestilling} disabled={!kanVidere} className={`${lagtTil ? 'btn-dark' : 'btn-primary'} flex-1 disabled:opacity-50`}>
                {lagtTil ? 'Lagt til ✓' : 'Legg i bestillingen'}
              </button>
              {lagtTil && <Link href="/bestill" className="btn-ghost">Gå til bestilling</Link>}
            </div>
            <button type="button" onClick={() => gaTil('3d')} className="mt-2 text-[13px] font-semibold text-brand-700 hover:underline">
              ← Tilbake til 3D
            </button>
            <p className="mt-3 text-xs leading-relaxed text-ink-500">
              Fast pris – vi setter i gang med en gang. Vil du ha flere like, endrer du antallet i bestillingen.
            </p>
          </Steg>
        )}
      </div>
    </div>
  );
}

function Laster({ tekst }: { tekst: string }) {
  return (
    <div className="grid aspect-square w-full max-w-[620px] place-items-center mx-auto">
      <div className="studio-hud flex items-center gap-2"><span className="studio-prikk opptatt" /> {tekst}</div>
    </div>
  );
}

function Tall({ etikett, verdi, sterk }: { etikett: string; verdi: string; sterk?: boolean }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-ink-50/60 px-3.5 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">{etikett}</p>
      <p className={`mt-0.5 text-base font-bold ${sterk ? 'text-brand-700' : 'text-ink-900'}`}>{verdi}</p>
    </div>
  );
}

function Pil({ tilbake }: { tilbake?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className={`inline ${tilbake ? 'rotate-180' : ''}`}>
      <path d="M5 12h14m0 0-5.5-5.5M19 12l-5.5 5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 1 Tegn · 2 3D · 3 Bestill – trykk på et steg du har vært på for å gå tilbake. */
function Stegviser({ fase, kan, onGa }: { fase: Fase; kan: boolean; onGa: (f: Fase) => void }) {
  const steg: [Fase, string][] = [['tegn', 'Tegn'], ['3d', 'Se i 3D'], ['bestill', 'Bestill']];
  const aktiv = steg.findIndex(([f]) => f === fase);
  return (
    <ol className="flex items-center gap-1.5 rounded-2xl border border-ink-100 bg-white p-1.5 shadow-soft">
      {steg.map(([f, navn], i) => {
        const tilgjengelig = i <= aktiv || (kan && i === aktiv + 1);
        return (
          <li key={f} className="flex-1">
            <button type="button" disabled={!tilgjengelig || i === aktiv} onClick={() => onGa(f)} aria-current={i === aktiv ? 'step' : undefined}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-2 py-2 text-[13px] font-semibold transition-colors ${
                i === aktiv ? 'bg-slate-900 text-white' : i < aktiv ? 'text-brand-700 hover:bg-brand-50' : 'text-ink-400'
              }`}>
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${i === aktiv ? 'bg-cyan-400 text-slate-900' : i < aktiv ? 'bg-brand-100 text-brand-700' : 'bg-ink-100'}`}>
                {i < aktiv ? '✓' : i + 1}
              </span>
              <span className="truncate">{navn}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Steg({ nr, tittel, children }: { nr: number; tittel: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
      <h2 className="mb-3 flex items-center gap-2.5 text-base font-bold text-ink-900">
        <span className="steg-nr grid h-7 w-9 place-items-center rounded-lg bg-slate-900 text-[11px] font-bold text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,.35)]">{String(nr).padStart(2, '0')}</span>
        {tittel}
      </h2>
      {children}
    </section>
  );
}
