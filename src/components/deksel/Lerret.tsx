'use client';

/**
 * Selve dekselet på skjermen. Lagene ligger som SVG, så alt flyttes i sanntid
 * mens du drar. «Slik blir det printet» vises når du slipper.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Analyse } from '@/lib/deksel/analyse';
import type { Rammer } from '@/lib/deksel/svg';
import { sti } from '@/lib/deksel/svg';
import { font } from '@/lib/deksel/fonter';
import { symbol } from '@/lib/deksel/symboler';
import {
  LINJEAVSTAND,
  flyttet,
  medStorrelse,
  storrelse,
  strekSti,
  type Lag,
} from '@/lib/deksel/lag';

export type Modus = 'flytt' | 'tegn' | 'visk';

type Pkt = { x: number; y: number };
type Gest =
  | { type: 'flytt'; id: string; l0: Lag; p0: Pkt }
  | { type: 'klyp'; id: string; l0: Lag; d0: number }
  | { type: 'skaler'; id: string; l0: Lag; c: Pkt; d0: number }
  | { type: 'roter'; id: string; l0: Lag; c: Pkt; a0: number }
  | { type: 'tegn' };

type Boks = { x: number; y: number; w: number; h: number };

export function Lerret({
  a,
  r,
  lag,
  valgt,
  modus,
  dekselHex,
  hex,
  printBilde,
  visPrint,
  bildeW,
  bildeH,
  skala,
  modellNavn,
  onVelg,
  onStart,
  onEndre,
  onSlett,
  onDobbel,
  onStrekStart,
  onStrekPunkt,
  onStrekSlutt,
}: {
  a: Analyse;
  r: Rammer;
  lag: Lag[];
  valgt: string | null;
  modus: Modus;
  dekselHex: string;
  hex: (id: string) => string;
  printBilde: string;
  /** true = vis det ferdige printbildet (bare når det er oppdatert) */
  visPrint: boolean;
  bildeW: number;
  bildeH: number;
  skala: number;
  modellNavn: string;
  onVelg: (id: string | null) => void;
  /** før en endring – lagrer et angre-punkt */
  onStart: () => void;
  onEndre: (l: Lag) => void;
  onSlett: (id: string) => void;
  onDobbel: (id: string) => void;
  onStrekStart: (u: number, v: number) => void;
  onStrekPunkt: (u: number, v: number) => void;
  onStrekSlutt: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const lagRef = useRef(lag);
  lagRef.current = lag;
  const gest = useRef<Gest | null>(null);
  const pekere = useRef(new Map<number, Pkt>());
  const [pxPerMm, setPxPerMm] = useState(3);

  const silSti = sti([a.silhuett, ...a.hull]);
  const tryggSti = sti(a.trygg.flat());
  const valgtLag = lag.find((l) => l.id === valgt) ?? null;

  // midten av sonen der man kan tegne, og kameraet – til «Lag ditt design her»
  const sone = useMemo(() => {
    const pts = a.trygg.flatMap((p) => p[0]);
    const us = pts.map((p) => p[0]), vs = pts.map((p) => p[1]);
    const kam = [...a.hull].sort((x, y) => y.length - x.length)[0];
    const kamSenter = kam ? [kam.reduce((s, p) => s + p[0], 0) / kam.length, kam.reduce((s, p) => s + p[1], 0) / kam.length] : null;
    return { cu: (Math.min(...us) + Math.max(...us)) / 2, cv: (Math.min(...vs) + Math.max(...vs)) / 2, b: Math.max(...us) - Math.min(...us), kam: kamSenter };
  }, [a]);

  function tilSvg(e: { clientX: number; clientY: number }): Pkt {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: q.x, y: q.y };
  }
  const finn = (id: string) => lagRef.current.find((l) => l.id === id);

  /* ---------- pekere ---------- */
  function lagNed(e: React.PointerEvent, id: string) {
    if (modus !== 'flytt') return; // i tegnemodus går trykket videre til lerretet
    e.stopPropagation();
    const svg = svgRef.current!;
    svg.setPointerCapture(e.pointerId);
    const p = tilSvg(e);
    pekere.current.set(e.pointerId, p);
    if (valgt !== id) onVelg(id);
    const l = finn(id);
    if (!l) return;
    onStart();
    if (pekere.current.size >= 2) {
      const [p1, p2] = [...pekere.current.values()];
      gest.current = { type: 'klyp', id, l0: l, d0: Math.hypot(p1.x - p2.x, p1.y - p2.y) };
    } else {
      gest.current = { type: 'flytt', id, l0: l, p0: p };
    }
  }

  function handtakNed(e: React.PointerEvent, type: 'skaler' | 'roter' | 'slett') {
    e.stopPropagation();
    if (!valgtLag) return;
    if (type === 'slett') { onSlett(valgtLag.id); return; }
    svgRef.current!.setPointerCapture(e.pointerId);
    const p = tilSvg(e);
    pekere.current.set(e.pointerId, p);
    onStart();
    const c = senterSvg(valgtLag);
    if (type === 'skaler') {
      gest.current = { type: 'skaler', id: valgtLag.id, l0: valgtLag, c, d0: Math.max(0.5, Math.hypot(p.x - c.x, p.y - c.y)) };
    } else {
      gest.current = { type: 'roter', id: valgtLag.id, l0: valgtLag, c, a0: Math.atan2(p.y - c.y, p.x - c.x) };
    }
  }

  function ned(e: React.PointerEvent) {
    const svg = svgRef.current!;
    const p = tilSvg(e);
    if (modus !== 'flytt') {
      svg.setPointerCapture(e.pointerId);
      pekere.current.set(e.pointerId, p);
      if (pekere.current.size > 1) return; // bare én finger tegner
      gest.current = { type: 'tegn' };
      onStrekStart(p.x, -p.y);
      return;
    }
    // klyp med to fingre på valgt lag, selv om andre finger treffer bakgrunnen
    if (gest.current && gest.current.type === 'flytt') {
      svg.setPointerCapture(e.pointerId);
      pekere.current.set(e.pointerId, p);
      const [p1, p2] = [...pekere.current.values()];
      const l = finn(gest.current.id);
      if (l) gest.current = { type: 'klyp', id: l.id, l0: l, d0: Math.hypot(p1.x - p2.x, p1.y - p2.y) };
      return;
    }
    onVelg(null);
  }

  function flytt(e: React.PointerEvent) {
    const g = gest.current;
    if (!g || !pekere.current.has(e.pointerId)) return;
    const p = tilSvg(e);
    pekere.current.set(e.pointerId, p);
    if (g.type === 'tegn') { onStrekPunkt(p.x, -p.y); return; }
    if (g.type === 'flytt') {
      onEndre(flyttet(g.l0, p.x - g.p0.x, -(p.y - g.p0.y)));
    } else if (g.type === 'klyp') {
      const pts = [...pekere.current.values()];
      if (pts.length < 2 || g.d0 <= 0) return;
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const s = storrelse(g.l0);
      if (s != null) onEndre(medStorrelse(g.l0, s * (d / g.d0)));
    } else if (g.type === 'skaler') {
      const s = storrelse(g.l0);
      const d = Math.hypot(p.x - g.c.x, p.y - g.c.y);
      if (s != null) onEndre(medStorrelse(g.l0, s * (d / g.d0)));
    } else if (g.type === 'roter' && g.l0.type !== 'tegning') {
      const vinkel = Math.atan2(p.y - g.c.y, p.x - g.c.x);
      let rot = g.l0.rot + ((vinkel - g.a0) * 180) / Math.PI;
      rot = ((rot % 360) + 540) % 360 - 180;
      for (const snap of [-180, -90, 0, 90, 180]) if (Math.abs(rot - snap) < 4) rot = snap;
      onEndre({ ...g.l0, rot: Math.round(rot) });
    }
  }

  function opp(e: React.PointerEvent) {
    pekere.current.delete(e.pointerId);
    const g = gest.current;
    if (!g) return;
    if (g.type === 'tegn') {
      if (pekere.current.size === 0) { onStrekSlutt(); gest.current = null; }
      return;
    }
    if (pekere.current.size === 1 && g.type === 'klyp') {
      // fortsett å flytte med fingeren som er igjen
      const l = finn(g.id);
      const rest = [...pekere.current.values()][0];
      if (l) gest.current = { type: 'flytt', id: l.id, l0: l, p0: rest };
      return;
    }
    if (pekere.current.size === 0) gest.current = null;
  }

  // rull = zoom på valgt lag
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let sist = 0;
    function hjul(e: WheelEvent) {
      const l = valgt ? lagRef.current.find((x) => x.id === valgt) : null;
      const s = l ? storrelse(l) : null;
      if (!l || s == null) return;
      e.preventDefault();
      if (Date.now() - sist > 600) onStart();
      sist = Date.now();
      onEndre(medStorrelse(l, s * Math.exp(-e.deltaY * 0.0015)));
    }
    svg.addEventListener('wheel', hjul, { passive: false });
    return () => svg.removeEventListener('wheel', hjul);
  }, [valgt, onEndre, onStart]);

  /* ---------- markering ---------- */
  const innerRef = useRef<SVGGElement>(null);
  const [boks, setBoks] = useState<Boks | null>(null);
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (svg) {
      const ctm = svg.getScreenCTM();
      if (ctm && Math.abs(ctm.a - pxPerMm) > 0.01) setPxPerMm(ctm.a);
    }
    const el = innerRef.current;
    if (!el || !valgtLag) { if (boks) setBoks(null); return; }
    try {
      const b = el.getBBox();
      const pad = valgtLag.type === 'tegning' ? Math.max(0, ...valgtLag.streker.map((s) => s.bredde)) / 2 : 0;
      const ny = { x: b.x - pad, y: b.y - pad, w: b.width + 2 * pad, h: b.height + 2 * pad };
      if (!boks || Math.abs(ny.x - boks.x) + Math.abs(ny.y - boks.y) + Math.abs(ny.w - boks.w) + Math.abs(ny.h - boks.h) > 0.01) setBoks(ny);
    } catch {
      /* ikke tegnet ennå */
    }
  });

  function senterSvg(l: Lag): Pkt {
    if (l.type === 'tegning') {
      const b = boks ?? { x: 0, y: 0, w: 0, h: 0 };
      return { x: l.du + b.x + b.w / 2, y: -l.dv + b.y + b.h / 2 };
    }
    return { x: l.u, y: -l.v };
  }

  /* ---------- tegning av lagene ---------- */
  function ytreTransform(l: Lag) {
    return l.type === 'tegning' ? `translate(${l.du} ${-l.dv})` : `translate(${l.u} ${-l.v}) rotate(${l.rot})`;
  }

  function innhold(l: Lag, treff: boolean) {
    switch (l.type) {
      case 'bilde': {
        const h = l.bredde * (l.el.naturalHeight / l.el.naturalWidth);
        return treff
          ? <rect x={-l.bredde / 2} y={-h / 2} width={l.bredde} height={h} fill="#000" />
          : <image href={l.url} x={-l.bredde / 2} y={-h / 2} width={l.bredde} height={h} preserveAspectRatio="none" />;
      }
      case 'symbol': {
        const s = symbol(l.symbol);
        const k = l.bredde / 24;
        return (
          <g transform={`scale(${k}) translate(-12 -12)`}>
            {treff && <rect x={1} y={1} width={22} height={22} fill="#000" />}
            <path d={s.d} fillRule={s.regel} fill={hex(l.farge)} />
          </g>
        );
      }
      case 'tekst': {
        const ft = font(l.font);
        const linjer = l.tekst.split('\n');
        const lengst = Math.max(1, ...linjer.map((t) => t.length));
        const hoyde = linjer.length * LINJEAVSTAND * l.hoyde;
        return (
          <>
            {treff && <rect x={(-lengst * l.hoyde * 0.62) / 2} y={-hoyde / 2} width={lengst * l.hoyde * 0.62} height={hoyde} fill="#000" />}
            <text
              fontFamily={`"${ft.familie}", system-ui, sans-serif`}
              fontWeight={ft.vekt}
              fontSize={l.hoyde}
              fill={hex(l.farge)}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ whiteSpace: 'pre' }}
            >
              {linjer.map((t, i) => (
                <tspan key={i} x={0} y={(i - (linjer.length - 1) / 2) * LINJEAVSTAND * l.hoyde}>{t || ' '}</tspan>
              ))}
            </text>
          </>
        );
      }
      case 'tegning':
        return l.streker.map((s, i) => (
          <path
            key={i}
            d={strekSti(s.punkter)}
            fill="none"
            stroke={s.visk ? dekselHex : hex(s.farge)}
            strokeWidth={treff ? Math.max(s.bredde, 4) : s.bredde}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ));
    }
  }

  const stabel = (treff: boolean) =>
    lag.map((l) => (
      <g
        key={l.id}
        transform={ytreTransform(l)}
        onPointerDown={treff ? (e) => lagNed(e, l.id) : undefined}
        onDoubleClick={treff ? () => onDobbel(l.id) : undefined}
        style={treff ? { cursor: modus === 'flytt' ? 'move' : 'crosshair' } : undefined}
      >
        <g ref={treff && l.id === valgt ? innerRef : undefined}>{innhold(l, treff)}</g>
      </g>
    ));

  const visLevende = !visPrint || !printBilde;
  const hr = 9 / pxPerMm; // håndtak ~9 px uansett zoom
  const kontrast = '#22D3EE';
  const mal = (n: number) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
  const hud = 1 / pxPerMm;

  return (
    <svg
      ref={svgRef}
      viewBox={`${r.u0 - 8} ${-r.v0 - 6} ${r.bredde + 22} ${r.hoyde + 18}`}
      className="mx-auto block h-[60vh] max-h-[620px] min-h-[380px] w-auto select-none"
      style={{ touchAction: 'none', overflow: 'visible', cursor: modus === 'flytt' ? 'default' : 'crosshair' }}
      onPointerDown={ned}
      onPointerMove={flytt}
      onPointerUp={opp}
      onPointerCancel={opp}
      role="img"
      aria-label={`Forhåndsvisning av deksel til ${modellNavn}`}
    >
      <defs>
        <clipPath id="dg-trygg"><path d={tryggSti} clipRule="evenodd" /></clipPath>
        <clipPath id="dg-sil"><path d={silSti} clipRule="evenodd" /></clipPath>
        <filter id="dg-skygge" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#22D3EE" floodOpacity="0.28" />
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000" floodOpacity="0.55" />
        </filter>
        <filter id="dg-glod" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={2.2 * hud} result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <path d={silSti} fill={dekselHex} fillRule="evenodd" filter="url(#dg-skygge)" stroke="rgba(103,232,249,.35)" strokeWidth={1.2 * hud} />

      {/* mål */}
      <g style={{ pointerEvents: 'none' }} stroke="rgba(103,232,249,.55)" strokeWidth={hud} fill="rgba(165,243,252,.85)"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={10 * hud}>
        <line x1={r.u0} x2={r.u0 + r.bredde} y1={-r.v0 + r.hoyde + 5} y2={-r.v0 + r.hoyde + 5} />
        <line x1={r.u0} x2={r.u0} y1={-r.v0 + r.hoyde + 3} y2={-r.v0 + r.hoyde + 7} />
        <line x1={r.u0 + r.bredde} x2={r.u0 + r.bredde} y1={-r.v0 + r.hoyde + 3} y2={-r.v0 + r.hoyde + 7} />
        <text x={r.u0 + r.bredde / 2} y={-r.v0 + r.hoyde + 5 + 12 * hud} textAnchor="middle" stroke="none">{mal(r.bredde)} mm</text>
        <line x1={r.u0 + r.bredde + 5} x2={r.u0 + r.bredde + 5} y1={-r.v0} y2={-r.v0 + r.hoyde} />
        <line x1={r.u0 + r.bredde + 3} x2={r.u0 + r.bredde + 7} y1={-r.v0} y2={-r.v0} />
        <line x1={r.u0 + r.bredde + 3} x2={r.u0 + r.bredde + 7} y1={-r.v0 + r.hoyde} y2={-r.v0 + r.hoyde} />
        <text x={r.u0 + r.bredde + 5 + 5 * hud} y={-r.v0 + r.hoyde / 2} stroke="none" dominantBaseline="middle"
          transform={`rotate(90 ${r.u0 + r.bredde + 5 + 5 * hud} ${-r.v0 + r.hoyde / 2})`} textAnchor="middle">{mal(r.hoyde)} mm</text>
      </g>

      {visLevende ? (
        <g style={{ pointerEvents: 'none' }}>
          <g clipPath="url(#dg-sil)" opacity="0.25">{stabel(false)}</g>
          <g clipPath="url(#dg-trygg)">{stabel(false)}</g>
        </g>
      ) : (
        <image href={printBilde} x={r.u0} y={-r.v0} width={bildeW * skala} height={bildeH * skala} preserveAspectRatio="none" style={{ pointerEvents: 'none' }} />
      )}

      {(visLevende || !lag.length || valgt) && (
        <path d={tryggSti} fill="none" stroke={kontrast} strokeOpacity="0.75" strokeWidth={1.2 * hud} strokeDasharray={`${5 * hud} ${4 * hud}`} fillRule="evenodd" style={{ pointerEvents: 'none' }} />
      )}

      {/* tomt deksel: vis hvor man kan lage designet */}
      {!lag.length && (
        <g style={{ pointerEvents: 'none' }} fontFamily="ui-sans-serif, system-ui, sans-serif" textAnchor="middle">
          <g transform={`translate(${sone.cu} ${-sone.cv})`}>
            <g transform={`translate(0 ${-sone.b * 0.33}) scale(${sone.b / 150})`} stroke="#0891B2" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.75}>
              <path d="M-9 9l2.6-0.6 11-11a2.1 2.1 0 0 0-3-3l-11 11z" transform="translate(1 -1) scale(1.6)" />
            </g>
            <text y={-sone.b * 0.03} fontSize={sone.b * 0.115} fontWeight={800} fill="#0E7490" opacity={0.85}>Lag ditt</text>
            <text y={sone.b * 0.11} fontSize={sone.b * 0.115} fontWeight={800} fill="#0E7490" opacity={0.85}>design her</text>
            <text y={sone.b * 0.22} fontSize={sone.b * 0.045} fill="#64748B">Tegn, skriv eller last opp et bilde</text>
            <text y={sone.b * 0.28} fontSize={sone.b * 0.045} fill="#64748B">innenfor den stiplede linjen</text>
          </g>
          {sone.kam && (
            <text x={sone.kam[0]} y={-sone.kam[1]} fontSize={sone.b * 0.04} fontWeight={700} letterSpacing={sone.b * 0.004}
              fill="#67E8F9" dominantBaseline="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">KAMERA</text>
          )}
        </g>
      )}

      {/* usynlige treffflater – det du tar tak i */}
      <g opacity="0">{stabel(true)}</g>

      {/* markering med håndtak */}
      {valgtLag && boks && modus === 'flytt' && (
        <g transform={ytreTransform(valgtLag)}>
          <rect x={boks.x} y={boks.y} width={boks.w} height={boks.h} fill="rgba(34,211,238,.06)" stroke="#22D3EE" strokeWidth={1.5 * hud} filter="url(#dg-glod)" style={{ pointerEvents: 'none' }} />
          {[[boks.x, boks.y], [boks.x + boks.w, boks.y], [boks.x, boks.y + boks.h]].map(([x, y], i) => (
            <rect key={i} x={x - 2.5 * hud} y={y - 2.5 * hud} width={5 * hud} height={5 * hud} fill="#22D3EE" style={{ pointerEvents: 'none' }} />
          ))}
          {/* slett */}
          <g transform={`translate(${boks.x} ${boks.y})`} onPointerDown={(e) => handtakNed(e, 'slett')} style={{ cursor: 'pointer' }}>
            <circle r={hr} fill="#E5484D" stroke="#fff" strokeWidth={1.5 / pxPerMm} />
            <path d={`M${-hr * 0.4} ${-hr * 0.4}L${hr * 0.4} ${hr * 0.4}M${hr * 0.4} ${-hr * 0.4}L${-hr * 0.4} ${hr * 0.4}`} stroke="#fff" strokeWidth={2 / pxPerMm} strokeLinecap="round" />
            <title>Slett</title>
          </g>
          {storrelse(valgtLag) != null && (
            <g transform={`translate(${boks.x + boks.w} ${boks.y + boks.h})`} onPointerDown={(e) => handtakNed(e, 'skaler')} style={{ cursor: 'nwse-resize' }}>
              <circle r={hr} fill="#22D3EE" stroke="#04121a" strokeWidth={1.5 / pxPerMm} filter="url(#dg-glod)" />
              <path d={`M${-hr * 0.35} ${hr * 0.35}L${hr * 0.35} ${-hr * 0.35}M${hr * 0.05} ${-hr * 0.35}H${hr * 0.35}V${hr * 0.05}M${-hr * 0.35} ${-hr * 0.05}V${hr * 0.35}H${-hr * 0.05}`} stroke="#04121a" strokeWidth={1.8 / pxPerMm} fill="none" strokeLinecap="round" />
              <title>Endre størrelse</title>
            </g>
          )}
          {valgtLag.type !== 'tegning' && (
            <>
              <line x1={boks.x + boks.w / 2} y1={boks.y} x2={boks.x + boks.w / 2} y2={boks.y - hr * 2.4} stroke="#22D3EE" strokeWidth={1.5 / pxPerMm} style={{ pointerEvents: 'none' }} />
              <g transform={`translate(${boks.x + boks.w / 2} ${boks.y - hr * 2.4})`} onPointerDown={(e) => handtakNed(e, 'roter')} style={{ cursor: 'grab' }}>
                <circle r={hr} fill="#04121a" stroke="#22D3EE" strokeWidth={1.8 / pxPerMm} filter="url(#dg-glod)" />
                <path d={`M${hr * 0.45} ${-hr * 0.1}A${hr * 0.45} ${hr * 0.45} 0 1 1 ${hr * 0.1} ${-hr * 0.45}`} stroke="#22D3EE" strokeWidth={1.6 / pxPerMm} fill="none" strokeLinecap="round" />
                <title>Roter</title>
              </g>
            </>
          )}
        </g>
      )}
    </svg>
  );
}
