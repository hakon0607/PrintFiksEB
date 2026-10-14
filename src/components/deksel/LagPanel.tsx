'use client';

/** Innstillingene for laget som er valgt: tekst, font, farge, størrelse, rotasjon. */
import type { RefObject } from 'react';
import type { Filament } from '@/lib/deksel/farger';
import { FONTER, font as finnFont } from '@/lib/deksel/fonter';
import { MIN_TEKST, lagNavn, type Lag } from '@/lib/deksel/lag';
import { Ikon } from './Ikon';
import { Fargeknapp } from './Fargeknapp';

export function LagPanel({
  lag: l,
  filamenter,
  dekselId,
  tillatt,
  maksFarger,
  tekstRef,
  boks,
  onEndre,
  onSlett,
  onDupliser,
  onFrem,
  onBak,
  onLukk,
}: {
  lag: Lag;
  filamenter: Filament[];
  dekselId: string;
  tillatt: (farge: string) => boolean;
  maksFarger: number;
  tekstRef: RefObject<HTMLTextAreaElement>;
  boks: { b: number; h: number; cu: number; cv: number };
  /** kontinuerlig = glidebryter/skriving (samles til ett angre-steg) */
  onEndre: (l: Lag, kontinuerlig?: boolean) => void;
  onSlett: () => void;
  onDupliser: () => void;
  onFrem: () => void;
  onBak: () => void;
  onLukk: () => void;
}) {
  const farge = l.type === 'tekst' || l.type === 'symbol' ? l.farge : l.type === 'tegning' ? l.streker.find((s) => !s.visk)?.farge ?? '' : '';
  const settFarge = (f: string) => {
    if (l.type === 'tekst' || l.type === 'symbol') onEndre({ ...l, farge: f });
    else if (l.type === 'tegning') onEndre({ ...l, streker: l.streker.map((s) => (s.visk ? s : { ...s, farge: f })) });
  };

  return (
    <div className="studio-panel mx-auto mt-3 max-w-xl p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="studio-etikett">Valgt</span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{lagNavn(l)}</span>
        <button type="button" onClick={onBak} className="studio-ikon" title="Legg bakover" aria-label="Legg bakover"><Ikon navn="bak" /></button>
        <button type="button" onClick={onFrem} className="studio-ikon" title="Legg fremover" aria-label="Legg fremover"><Ikon navn="frem" /></button>
        <button type="button" onClick={onDupliser} className="studio-ikon" title="Dupliser" aria-label="Dupliser"><Ikon navn="kopi" /></button>
        <button type="button" onClick={onSlett} className="studio-ikon hover:!text-red-400" title="Slett" aria-label="Slett"><Ikon navn="soppel" /></button>
        <button type="button" onClick={onLukk} className="studio-ikon" title="Ferdig" aria-label="Lukk"><Ikon navn="lukk" /></button>
      </div>

      {l.type === 'tekst' && (
        <>
          <textarea
            ref={tekstRef}
            value={l.tekst}
            rows={Math.min(4, Math.max(1, l.tekst.split('\n').length))}
            onChange={(e) => onEndre({ ...l, tekst: e.target.value.slice(0, 120) }, true)}
            className="studio-felt w-full resize-none text-base"
            placeholder="Skriv teksten din"
            aria-label="Tekst"
            style={{ fontFamily: `"${finnFont(l.font).familie}", system-ui` }}
          />
          <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {FONTER.map((f) => (
              <button key={f.id} type="button" onClick={() => onEndre({ ...l, font: f.id })} aria-pressed={l.font === f.id}
                className={`truncate rounded-lg border px-2 py-2 text-[15px] leading-none transition-colors ${l.font === f.id ? 'border-cyan-400 bg-cyan-400/10 text-white shadow-[0_0_0_1px_rgba(34,211,238,.4),0_0_18px_-4px_rgba(34,211,238,.7)]' : 'border-white/10 text-white/75 hover:border-white/30'}`}
                style={{ fontFamily: `"${f.familie}", system-ui`, fontWeight: f.vekt }} title={f.navn}>
                {f.navn}
              </button>
            ))}
          </div>
        </>
      )}

      {l.type !== 'bilde' && (
        <div className="mt-3">
          <span className="studio-etikett">Farge</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {filamenter.filter((f) => f.id !== dekselId).map((f) => (
              <Fargeknapp key={f.id} f={f} liten valgt={farge === f.id} deaktivert={!tillatt(f.id)} onClick={() => settFarge(f.id)} />
            ))}
          </div>
          {filamenter.filter((f) => f.id !== dekselId).some((f) => !tillatt(f.id)) && (
            <p className="mt-1.5 text-[11px] text-white/45">Maks {maksFarger} farger – noen er grået ut til du fjerner en farge.</p>
          )}
        </div>
      )}

      {l.type === 'tekst' && (
        <Glider etikett="Høyde" verdi={l.hoyde} min={2} maks={60} steg={0.5} enhet="mm"
          onChange={(v) => onEndre({ ...l, hoyde: v }, true)} />
      )}
      {(l.type === 'symbol' || l.type === 'bilde') && (
        <Glider etikett="Bredde" verdi={l.bredde} min={l.type === 'symbol' ? 4 : 10} maks={l.type === 'symbol' ? 150 : 300} steg={0.5} enhet="mm"
          onChange={(v) => onEndre({ ...l, bredde: v }, true)} />
      )}
      {l.type !== 'tegning' && (
        <Glider etikett="Rotasjon" verdi={l.rot} min={-180} maks={180} steg={1} enhet="°"
          onChange={(v) => onEndre({ ...l, rot: v }, true)} />
      )}
      {l.type === 'tekst' && l.hoyde < MIN_TEKST && (
        <p className="mt-2 text-xs font-semibold text-amber-300">Tekst under {MIN_TEKST} mm kan bli utydelig i print.</p>
      )}

      {l.type === 'bilde' && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="studio-knapp" onClick={() => {
            const f = l.el.naturalHeight / l.el.naturalWidth;
            const sidelengs = Math.abs(l.rot) % 180 === 90;
            const bw = sidelengs ? boks.h : boks.b, bh = sidelengs ? boks.b : boks.h;
            onEndre({ ...l, u: boks.cu, v: boks.cv, bredde: Math.max(bw, bh / f) });
          }}><Ikon navn="fyll" /> Fyll hele</button>
          <button type="button" className="studio-knapp" onClick={() => {
            const f = l.el.naturalHeight / l.el.naturalWidth;
            const sidelengs = Math.abs(l.rot) % 180 === 90;
            const bw = sidelengs ? boks.h : boks.b, bh = sidelengs ? boks.b : boks.h;
            onEndre({ ...l, u: boks.cu, v: boks.cv, bredde: Math.min(bw, bh / f) });
          }}><Ikon navn="tilpass" /> Tilpass</button>
          <button type="button" className="studio-knapp" onClick={() => onEndre({ ...l, rot: ((l.rot + 90 + 180) % 360) - 180 })}>
            Roter 90°
          </button>
        </div>
      )}
      {l.type === 'tegning' && (
        <p className="mt-3 text-xs text-white/55">Dra tegningen for å flytte den. Vil du tegne mer, trykk «Tegn».</p>
      )}
    </div>
  );
}

function Glider({
  etikett, verdi, min, maks, steg, enhet, onChange,
}: { etikett: string; verdi: number; min: number; maks: number; steg: number; enhet: string; onChange: (v: number) => void }) {
  return (
    <label className="mt-3 flex items-center gap-3">
      <span className="studio-etikett w-16">{etikett}</span>
      <input type="range" min={min} max={maks} step={steg} value={verdi}
        onChange={(e) => onChange(Number(e.target.value))} className="studio-glider flex-1" />
      <span className="w-16 text-right font-mono text-xs tabular-nums text-cyan-300">
        {(Number.isInteger(verdi) ? String(verdi) : verdi.toFixed(1)).replace('.', ',')} {enhet}
      </span>
    </label>
  );
}
