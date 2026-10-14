'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '@/lib/cart';
import type { Analyse, Ring } from '@/lib/deksel/analyse';
import {
  dekselPris,
  hexTilRgb,
  posteriser,
  utvalg,
  velgFarger,
  type Filament,
} from '@/lib/deksel/farger';
import { rammer, sti } from '@/lib/deksel/svg';

export type DekselModell = { id: string; navn: string; analyse: Analyse };

const SKALA = 0.25; // mm per piksel i fargekartet

type Plassering = { u: number; v: number; bredde: number; rot: number };

function tryggBoks(a: Analyse) {
  const pts = a.trygg.flatMap((p) => p[0]);
  const us = pts.map((p) => p[0]);
  const vs = pts.map((p) => p[1]);
  const minU = Math.min(...us), maxU = Math.max(...us), minV = Math.min(...vs), maxV = Math.max(...vs);
  return { minU, maxU, minV, maxV, b: maxU - minU, h: maxV - minV, cu: (minU + maxU) / 2, cv: (minV + maxV) / 2 };
}

export function DekselGenerator({
  modeller,
  filamenter,
  grunnpris,
  perFarge,
  maksFarger,
}: {
  modeller: DekselModell[];
  filamenter: Filament[];
  grunnpris: number;
  perFarge: number;
  maksFarger: number;
}) {
  const { add } = useCart();
  const [modellId, setModellId] = useState(modeller[0]?.id ?? '');
  const modell = modeller.find((m) => m.id === modellId) ?? null;
  const a = modell?.analyse ?? null;

  const [bilde, setBilde] = useState<{ el: HTMLImageElement; url: string; navn: string } | null>(null);
  const [plass, setPlass] = useState<Plassering | null>(null);
  const [feil, setFeil] = useState('');

  const [dekselId, setDekselId] = useState(filamenter[0]?.id ?? '');
  const [antall, setAntall] = useState(Math.min(2, maksFarger));
  const [motivIder, setMotivIder] = useState<string[]>([]);
  const [manuelt, setManuelt] = useState(false);
  const [visning, setVisning] = useState<'print' | 'original'>('print');
  const [printBilde, setPrintBilde] = useState('');
  const [brukteFarger, setBrukteFarger] = useState<number[]>([]);
  const [lagtTil, setLagtTil] = useState(false);
  const [velger, setVelger] = useState<number | null>(null);

  const r = a ? rammer(a.silhuett) : null;
  const boks = useMemo(() => (a ? tryggBoks(a) : null), [a]);
  const W = r ? Math.ceil(r.bredde / SKALA) : 0;
  const H = r ? Math.ceil(r.hoyde / SKALA) : 0;

  const dekselFil = filamenter.find((f) => f.id === dekselId) ?? filamenter[0];
  const motivFil = motivIder.map((id) => filamenter.find((f) => f.id === id)!).filter(Boolean);
  const palett = [dekselFil, ...motivFil];
  const antallBrukt = brukteFarger.filter((i) => i > 0).length;
  const pris = dekselPris(grunnpris, perFarge, bilde ? Math.max(1, antallBrukt) : 0);

  /* ---------- bilde inn ---------- */
  function lastBilde(fil: File | undefined) {
    if (!fil) return;
    if (!fil.type.startsWith('image/')) { setFeil('Det der er ikke et bilde.'); return; }
    if (fil.size > 25 * 1024 * 1024) { setFeil('Bildet er for stort (maks 25 MB).'); return; }
    const url = URL.createObjectURL(fil);
    const el = new window.Image();
    el.onload = () => {
      setFeil('');
      setBilde((gml) => { if (gml) URL.revokeObjectURL(gml.url); return { el, url, navn: fil.name }; });
      setManuelt(false);
    };
    el.onerror = () => setFeil('Klarte ikke å åpne bildet. Prøv JPG eller PNG.');
    el.src = url;
  }

  // ny modell eller nytt bilde: fyll den trygge sonen
  const fyll = useCallback(
    (modus: 'fyll' | 'tilpass') => {
      if (!bilde || !boks) return;
      const forhold = bilde.el.naturalHeight / bilde.el.naturalWidth;
      const sidelengs = plass ? plass.rot % 180 !== 0 : false;
      const bw = sidelengs ? boks.h : boks.b;
      const bh = sidelengs ? boks.b : boks.h;
      const bredde =
        modus === 'fyll' ? Math.max(bw, bh / forhold) : Math.min(bw, bh / forhold);
      setPlass((p) => ({ u: boks.cu, v: boks.cv, bredde, rot: p?.rot ?? 0 }));
    },
    [bilde, boks, plass]
  );

  useEffect(() => {
    if (bilde && boks) {
      const forhold = bilde.el.naturalHeight / bilde.el.naturalWidth;
      // tilpass – hele bildet synes, sentrert
      setPlass({ u: boks.cu, v: boks.cv, bredde: Math.min(boks.b, boks.h / forhold), rot: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bilde, modellId]);

  /* ---------- rasterisering + farger ---------- */
  const kartRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!a || !r || !bilde || !plass) { setPrintBilde(''); return; }
    const t = window.setTimeout(() => {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      // mm (y opp) → piksler
      ctx.setTransform(1 / SKALA, 0, 0, -1 / SKALA, -r.u0 / SKALA, r.v0 / SKALA);
      ctx.save();
      ctx.translate(plass.u, plass.v);
      ctx.rotate((-plass.rot * Math.PI) / 180);
      ctx.scale(1, -1);
      const h = plass.bredde * (bilde.el.naturalHeight / bilde.el.naturalWidth);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bilde.el, -plass.bredde / 2, -h / 2, plass.bredde, h);
      ctx.restore();
      const rgba = ctx.getImageData(0, 0, W, H).data;

      // maske: trygg sone
      const m = document.createElement('canvas');
      m.width = W; m.height = H;
      const mc = m.getContext('2d', { willReadFrequently: true })!;
      mc.setTransform(1 / SKALA, 0, 0, -1 / SKALA, -r.u0 / SKALA, r.v0 / SKALA);
      mc.fillStyle = '#000';
      const p = new Path2D();
      for (const poly of a.trygg) for (const ring of poly) {
        ring.forEach(([u, v], i) => (i ? p.lineTo(u, v) : p.moveTo(u, v)));
        p.closePath();
      }
      mc.fill(p, 'evenodd');
      const ma = mc.getImageData(0, 0, W, H).data;
      const maske = new Uint8Array(W * H);
      for (let i = 0; i < maske.length; i++) maske[i] = ma[i * 4 + 3] > 127 ? 1 : 0;

      // farger: automatisk, med mindre kunden har valgt selv
      let ider = motivIder;
      if (!manuelt || ider.length !== antall || ider.includes(dekselId)) {
        ider = velgFarger(utvalg(rgba, maske), filamenter, dekselId, antall);
        if (ider.join() !== motivIder.join()) setMotivIder(ider);
      }
      const pal = [dekselId, ...ider].map((id) => (filamenter.find((f) => f.id === id) ?? filamenter[0]).hex);
      const kart = posteriser(rgba, W, H, pal, maske);
      kartRef.current = kart;
      const brukt = new Set<number>();
      kart.forEach((v) => brukt.add(v));
      setBrukteFarger([...brukt].sort());

      // tegn fargekartet: gjennomsiktig der dekselfargen er
      const ut = document.createElement('canvas');
      ut.width = W; ut.height = H;
      const oc = ut.getContext('2d')!;
      const img = oc.createImageData(W, H);
      const rgb = pal.map(hexTilRgb);
      for (let i = 0; i < kart.length; i++) {
        if (!kart[i]) continue;
        const [rr, gg, bb] = rgb[kart[i]];
        img.data[i * 4] = rr; img.data[i * 4 + 1] = gg; img.data[i * 4 + 2] = bb; img.data[i * 4 + 3] = 255;
      }
      oc.putImageData(img, 0, 0);
      setPrintBilde(ut.toDataURL('image/png'));
    }, 140);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, bilde, plass, dekselId, antall, manuelt, motivIder.join(), W, H]);

  /* ---------- dra, zoom, klyp ---------- */
  const svgRef = useRef<SVGSVGElement>(null);
  const pekere = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{ plass: Plassering; avstand: number; punkt: { x: number; y: number } } | null>(null);

  function tilMm(e: { clientX: number; clientY: number }) {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: q.x, y: q.y };
  }

  function ned(e: React.PointerEvent) {
    if (!plass) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pekere.current.set(e.pointerId, tilMm(e));
    const pts = [...pekere.current.values()];
    start.current = {
      plass,
      punkt: pts[0],
      avstand: pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0,
    };
  }
  function flytt(e: React.PointerEvent) {
    if (!start.current || !pekere.current.has(e.pointerId)) return;
    pekere.current.set(e.pointerId, tilMm(e));
    const pts = [...pekere.current.values()];
    const s = start.current;
    if (pts.length > 1 && s.avstand > 0) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      setPlass({ ...s.plass, bredde: Math.max(5, Math.min(400, s.plass.bredde * (d / s.avstand))) });
    } else {
      const dx = pts[0].x - s.punkt.x, dy = pts[0].y - s.punkt.y;
      setPlass({ ...s.plass, u: s.plass.u + dx, v: s.plass.v - dy });
    }
  }
  function opp(e: React.PointerEvent) {
    pekere.current.delete(e.pointerId);
    const pts = [...pekere.current.values()];
    start.current = pts.length && plass ? { plass, punkt: pts[0], avstand: 0 } : null;
  }

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    function hjul(e: WheelEvent) {
      if (!plass) return;
      e.preventDefault();
      setPlass((p) => (p ? { ...p, bredde: Math.max(5, Math.min(400, p.bredde * Math.exp(-e.deltaY * 0.0015))) } : p));
    }
    svg.addEventListener('wheel', hjul, { passive: false });
    return () => svg.removeEventListener('wheel', hjul);
  }, [plass]);

  /* ---------- legg i bestillingen ---------- */
  function leggTil() {
    if (!modell || !a || !r || !printBilde) return;
    const bruktIdx = brukteFarger.filter((i) => i > 0);
    // bare fargene som faktisk er i motivet, i samme rekkefølge som kartet
    const farger = palett.map((f) => ({ navn: f.navn, hex: f.hex }));
    add({
      kind: 'deksel',
      qty: 1,
      title: `Deksel med eget motiv – ${modell.navn}`,
      price: dekselPris(grunnpris, perFarge, Math.max(1, bruktIdx.length)),
      modellId: modell.id,
      modellNavn: modell.navn,
      farger,
      design: printBilde,
      ramme: { u0: r.u0, v0: r.v0, skala: SKALA, bredde: W, hoyde: H },
      silhuett: sti([a.silhuett, ...a.hull]),
    });
    setLagtTil(true);
  }

  /* ---------- tegning ---------- */
  if (!modeller.length) {
    return (
      <div className="rounded-3xl border border-dashed border-ink-200 bg-white/70 px-6 py-14 text-center">
        <p className="text-lg font-semibold text-ink-800">Dekselgeneratoren åpner snart</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
          Vi legger inn mobilmodellene nå. Vil du ha et deksel allerede? Send oss en melding.
        </p>
        <Link href={sporOssLenke('')} className="btn-primary mt-6">
          Spør oss
        </Link>
      </div>
    );
  }

  const silSti = a ? sti([a.silhuett, ...a.hull]) : '';
  const tryggSti = a ? sti(a.trygg.flat()) : '';
  const bh = bilde && plass ? plass.bredde * (bilde.el.naturalHeight / bilde.el.naturalWidth) : 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
      {/* ================= Forhåndsvisning ================= */}
      <div className="lg:sticky lg:top-24">
        <div className="relative overflow-hidden rounded-[2rem] border border-ink-100 bg-gradient-to-b from-ink-50 to-ink-100/70 p-6 sm:p-10">
          {a && r && (
            <svg
              ref={svgRef}
              viewBox={`${r.u0 - 4} ${-r.v0 - 4} ${r.bredde + 8} ${r.hoyde + 8}`}
              className={`mx-auto block h-[60vh] max-h-[620px] min-h-[380px] w-auto select-none ${bilde ? 'cursor-grab active:cursor-grabbing' : ''}`}
              style={{ touchAction: 'none' }}
              onPointerDown={ned}
              onPointerMove={flytt}
              onPointerUp={opp}
              onPointerCancel={opp}
              role="img"
              aria-label={`Forhåndsvisning av deksel til ${modell?.navn}`}
            >
              <defs>
                <clipPath id="dg-trygg"><path d={tryggSti} clipRule="evenodd" /></clipPath>
                <clipPath id="dg-sil"><path d={silSti} clipRule="evenodd" /></clipPath>
                <filter id="dg-skygge" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="1.6" stdDeviation="2.2" floodOpacity="0.22" />
                </filter>
              </defs>

              <path d={silSti} fill={dekselFil.hex} fillRule="evenodd" filter="url(#dg-skygge)" stroke="rgba(0,0,0,.15)" strokeWidth="0.4" />

              {bilde && plass && visning === 'original' && (
                <>
                  <g clipPath="url(#dg-sil)" opacity="0.28">
                    <image href={bilde.url} x={-plass.bredde / 2} y={-bh / 2} width={plass.bredde} height={bh}
                      transform={`translate(${plass.u} ${-plass.v}) rotate(${plass.rot})`} preserveAspectRatio="none" />
                  </g>
                  <g clipPath="url(#dg-trygg)">
                    <image href={bilde.url} x={-plass.bredde / 2} y={-bh / 2} width={plass.bredde} height={bh}
                      transform={`translate(${plass.u} ${-plass.v}) rotate(${plass.rot})`} preserveAspectRatio="none" />
                  </g>
                </>
              )}
              {bilde && visning === 'print' && printBilde && (
                <image href={printBilde} x={r.u0} y={-r.v0} width={W * SKALA} height={H * SKALA} preserveAspectRatio="none" style={{ imageRendering: 'auto' }} />
              )}

              {(!bilde || visning === 'original') && (
                <path d={tryggSti} fill="none" stroke={dekselFil.hex.toUpperCase() === '#1B1B1D' ? '#ffffff' : '#2559C7'} strokeOpacity="0.6" strokeWidth="0.45" strokeDasharray="1.6 1.2" fillRule="evenodd" />
              )}
            </svg>
          )}

          {!bilde && (
            <div className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-sm font-semibold text-ink-500">
              Den stiplede linjen viser hvor motivet kan ligge
            </div>
          )}
        </div>

        {bilde && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex rounded-full border border-ink-200 bg-ink-50 p-1" role="group" aria-label="Visning">
              {(['print', 'original'] as const).map((v) => (
                <button key={v} type="button" onClick={() => setVisning(v)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${visning === v ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-50'}`}>
                  {v === 'print' ? 'Slik blir det printet' : 'Originalbildet'}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => fyll('fyll')} className="btn-ghost btn-sm">Fyll</button>
            <button type="button" onClick={() => fyll('tilpass')} className="btn-ghost btn-sm">Tilpass</button>
            <button type="button" onClick={() => setPlass((p) => (p ? { ...p, rot: (p.rot + 90) % 360 } : p))} className="btn-ghost btn-sm" aria-label="Roter 90 grader">
              Roter ↻
            </button>
          </div>
        )}
        {bilde && plass && (
          <div className="mx-auto mt-3 flex max-w-sm items-center gap-3">
            <span className="text-xs font-semibold text-ink-500">Størrelse</span>
            <input type="range" min={10} max={300} step={1} value={Math.round(plass.bredde)}
              onChange={(e) => setPlass({ ...plass, bredde: Number(e.target.value) })} className="flex-1 accent-brand-600" aria-label="Størrelse på bildet" />
          </div>
        )}
        {bilde && (
          <p className="mt-2 text-center text-xs text-ink-500">Dra bildet for å flytte det. Klyp eller rull for å zoome.</p>
        )}
      </div>

      {/* ================= Valg ================= */}
      <div className="space-y-4">
        <Steg nr={1} tittel="Velg mobil">
          <select value={modellId} onChange={(e) => { setModellId(e.target.value); setLagtTil(false); }} className="field" aria-label="Mobilmodell">
            {modeller.map((m) => (<option key={m.id} value={m.id}>{m.navn}</option>))}
          </select>
          <p className="mt-2 text-[13px] text-ink-500">
            Finner du ikke mobilen din?{' '}
            <Link href={sporOssLenke('')} className="font-semibold text-brand-700 underline underline-offset-4">Spør oss</Link>
            {' '}– vi sjekker om vi kan lage den.
          </p>
        </Steg>

        <Steg nr={2} tittel="Last opp bilde">
          <label
            className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink-200 bg-white px-4 py-6 text-center transition-colors hover:border-brand-300"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); lastBilde(e.dataTransfer.files?.[0]); }}
          >
            <span className="text-sm font-semibold text-ink-800">{bilde ? 'Bytt bilde' : 'Velg bilde'}</span>
            <span className="text-xs text-ink-500">{bilde ? bilde.navn : 'eller dra det hit'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { lastBilde(e.target.files?.[0]); e.target.value = ''; setLagtTil(false); }} />
          </label>
          {feil && <p className="mt-2 text-xs font-semibold text-red-600">{feil}</p>}
          <p className="mt-2 rounded-xl bg-brand-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-brand-900">
            <span className="font-semibold">Tips:</span> Logoer, tegninger og tekst blir skarpest. Vanlige bilder
            gjøres om til flate farger – se «Slik blir det printet» før du bestiller.
          </p>
        </Steg>

        <Steg nr={3} tittel="Farger">
          <p className="label">Dekselfarge</p>
          <div className="flex flex-wrap gap-2">
            {filamenter.map((f) => (
              <Fargeknapp key={f.id} f={f} valgt={f.id === dekselId} onClick={() => { setDekselId(f.id); setLagtTil(false); }} />
            ))}
          </div>

          <p className="label mt-4">Farger i motivet</p>
          <div className="inline-flex rounded-full border border-ink-200 bg-ink-50 p-1" role="group">
            {Array.from({ length: maksFarger }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" onClick={() => { setAntall(n); setManuelt(false); setLagtTil(false); }}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${antall === n ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-50'}`}>
                {n}
              </button>
            ))}
          </div>

          {motivFil.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {motivFil.map((f, i) => (
                <div key={i} className="relative">
                  <button type="button" onClick={() => setVelger(velger === i ? null : i)}
                    className="flex items-center gap-2 rounded-full border border-ink-200 bg-ink-50 py-1 pl-1 pr-3 text-sm font-semibold text-ink-700 hover:border-brand-300">
                    <span className="h-6 w-6 rounded-full border border-black/10" style={{ background: f.hex }} />
                    {f.navn}
                    <span className="text-ink-400">▾</span>
                  </button>
                  <AnimatePresence>
                    {velger === i && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="solid-hvit absolute left-0 z-30 mt-2 flex w-56 flex-wrap gap-2 rounded-2xl border border-ink-200 bg-white p-3 shadow-lift">
                        {filamenter.filter((x) => x.id !== dekselId && (x.id === f.id || !motivIder.includes(x.id))).map((x) => (
                          <Fargeknapp key={x.id} f={x} valgt={x.id === f.id} liten onClick={() => {
                            const nye = [...motivIder]; nye[i] = x.id; setMotivIder(nye); setManuelt(true); setVelger(null); setLagtTil(false);
                          }} />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
              {manuelt && (
                <button type="button" onClick={() => setManuelt(false)} className="text-[13px] font-semibold text-brand-700 hover:underline">
                  Velg automatisk
                </button>
              )}
            </div>
          )}
          <p className="hint">Vi velger fargene som ligner mest på bildet. Trykk på en farge for å bytte.</p>
        </Steg>

        <Steg nr={4} tittel="Pris og bestilling">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-ink-600">Deksel med motiv</dt><dd className="font-semibold">{grunnpris} kr</dd></div>
            <div className="flex justify-between">
              <dt className="text-ink-600">{Math.max(1, antallBrukt)} {Math.max(1, antallBrukt) === 1 ? 'farge' : 'farger'} i motivet × {perFarge} kr</dt>
              <dd className="font-semibold">{perFarge * Math.max(1, antallBrukt)} kr</dd>
            </div>
            <div className="flex justify-between border-t border-ink-100 pt-2 text-base"><dt className="font-bold">Totalt</dt><dd className="font-bold text-brand-700">{bilde ? pris : dekselPris(grunnpris, perFarge, 1)} kr</dd></div>
          </dl>
          {bilde && antallBrukt < antall && (
            <p className="mt-2 text-xs text-ink-500">Bildet bruker bare {antallBrukt} av fargene – du betaler bare for dem.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={leggTil} disabled={!bilde || !printBilde} className={`${lagtTil ? 'btn-dark' : 'btn-primary'} flex-1 disabled:opacity-50`}>
              {lagtTil ? 'Lagt til ✓' : 'Legg i bestillingen'}
            </button>
            {lagtTil && <Link href="/bestill" className="btn-ghost">Gå til bestilling</Link>}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-500">
            Motivet printes inn i baksiden, så det kjennes helt glatt og ikke kan skrapes av. Fast pris – vi
            setter i gang med en gang.
          </p>
        </Steg>
      </div>
    </div>
  );
}

function sporOssLenke(modell: string) {
  const tekst = `Hei! Jeg vil gjerne ha et deksel med eget motiv til ${modell || '[skriv mobilmodellen din her]'}.`;
  return `/bestill?q=${encodeURIComponent(tekst)}`;
}

function Steg({ nr, tittel, children }: { nr: number; tittel: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
      <h2 className="mb-3 flex items-center gap-2.5 text-base font-bold text-ink-900">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">{nr}</span>
        {tittel}
      </h2>
      {children}
    </section>
  );
}

function Fargeknapp({ f, valgt, onClick, liten }: { f: Filament; valgt: boolean; onClick: () => void; liten?: boolean }) {
  return (
    <button type="button" onClick={onClick} title={f.navn} aria-label={f.navn} aria-pressed={valgt}
      className={`grid place-items-center rounded-full border transition-all ${liten ? 'h-9 w-9' : 'h-11 w-11'} ${valgt ? 'border-brand-500 ring-4 ring-brand-100' : 'border-ink-200 hover:border-brand-300'}`}>
      <span className={`${liten ? 'h-6 w-6' : 'h-8 w-8'} rounded-full border border-black/10`} style={{ background: f.hex }} />
    </button>
  );
}

export type { Ring };
