'use client';

/** Innstillingene for laget som er valgt: tekst, font, farge, fylt/omriss og størrelse. */
import type { RefObject } from 'react';
import type { Filament } from '@/lib/deksel/farger';
import { FONTER, font as finnFont } from '@/lib/deksel/fonter';
import { MIN_TEKST, lagNavn, type Lag, type Stil } from '@/lib/deksel/lag';
import { autoMengde } from '@/lib/deksel/bildefarge';
import { Ikon } from './Ikon';
import { FargeVelger } from './FargeVelger';

export function LagPanel({
  lag: l,
  filamenter,
  dekselId,
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
  const harEnFarge = l.type !== 'bilde' || !!l.farge;
  const farge = l.type === 'tekst' || l.type === 'symbol' ? l.farge : l.type === 'bilde' ? l.farge ?? '' : l.streker.find((s) => !s.visk)?.farge ?? '';
  const settFarge = (f: string) => {
    if (l.type === 'tekst' || l.type === 'symbol' || l.type === 'bilde') onEndre({ ...l, farge: f });
    else onEndre({ ...l, streker: l.streker.map((s) => (s.visk ? s : { ...s, farge: f })) });
  };
  const valgbare = filamenter.filter((f) => f.id !== dekselId);
  const stil = l.type === 'tegning' ? null : l.stil ?? 'fyll';
  const roter90 = () => { if (l.type !== 'tegning') onEndre({ ...l, rot: ((l.rot + 90 + 180) % 360) - 180 }); };
  const tilpass = (fyll: boolean) => {
    if (l.type !== 'bilde') return;
    const f = l.el.naturalHeight / l.el.naturalWidth;
    const sidelengs = Math.abs(l.rot) % 180 === 90;
    const bw = sidelengs ? boks.h : boks.b, bh = sidelengs ? boks.b : boks.h;
    onEndre({ ...l, u: boks.cu, v: boks.cv, bredde: fyll ? Math.max(bw, bh / f) : Math.min(bw, bh / f) });
  };

  return (
    <div className="studio-panel mx-auto mt-3 max-w-xl space-y-3.5 p-4">
      <div className="flex items-center gap-2">
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
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            {FONTER.map((f) => (
              <button key={f.id} type="button" onClick={() => onEndre({ ...l, font: f.id })} aria-pressed={l.font === f.id}
                className={`shrink-0 rounded-lg border px-3 py-2 text-[15px] leading-none transition-colors ${l.font === f.id ? 'border-cyan-400 bg-cyan-400/10 text-white shadow-[0_0_0_1px_rgba(34,211,238,.4)]' : 'border-white/10 text-white/75 hover:border-white/30'}`}
                style={{ fontFamily: `"${f.familie}", system-ui`, fontWeight: f.vekt }} title={f.navn}>
                {f.navn}
              </button>
            ))}
          </div>
        </>
      )}

      {l.type === 'bilde' && (
        <Valg
          verdi={l.farge ? 'en' : 'alle'}
          valg={[['alle', 'Farger fra bildet'], ['en', 'Én farge']]}
          onVelg={(v) => {
            if (v === 'alle') onEndre({ ...l, farge: undefined });
            else onEndre({ ...l, farge: valgbare[0]?.id, stil: l.stil ?? 'fyll' });
          }}
        />
      )}

      {harEnFarge && (
        <div>
          <span className="studio-etikett">Farge</span>
          <div className="mt-1.5">
            <FargeVelger valgt={farge} filamenter={filamenter} dekselId={dekselId} onVelg={settFarge} />
          </div>
        </div>
      )}

      {stil && harEnFarge && (
        <Valg
          verdi={stil}
          valg={[['fyll', 'Fylt'], ['omriss', 'Omriss']]}
          onVelg={(v) => onEndre({ ...l, stil: v as Stil } as Lag)}
        />
      )}

      {l.type === 'bilde' && l.farge && (
        <div className="flex items-center gap-2">
          <Glider etikett="Mengde" verdi={l.mengde ?? autoMengde(l.el)} min={2} maks={98} steg={1} enhet="%"
            onChange={(v) => onEndre({ ...l, mengde: v }, true)} />
          <button type="button" className="studio-knapp shrink-0" onClick={() => onEndre({ ...l, snu: !l.snu })} aria-pressed={!!l.snu}
            title="Bytt om lyst og mørkt">Snu</button>
        </div>
      )}

      {l.type === 'tekst' && (
        <Glider etikett="Størrelse" verdi={l.hoyde} min={2} maks={60} steg={0.5} enhet="mm"
          onChange={(v) => onEndre({ ...l, hoyde: v }, true)} />
      )}
      {(l.type === 'symbol' || l.type === 'bilde') && (
        <Glider etikett="Størrelse" verdi={l.bredde} min={l.type === 'symbol' ? 4 : 10} maks={l.type === 'symbol' ? 150 : 300} steg={0.5} enhet="mm"
          onChange={(v) => onEndre({ ...l, bredde: v }, true)} />
      )}
      {l.type === 'tekst' && l.hoyde < MIN_TEKST && (
        <p className="text-xs font-semibold text-amber-300">Tekst under {MIN_TEKST} mm kan bli utydelig i print.</p>
      )}

      {l.type !== 'tegning' && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="studio-knapp" onClick={roter90}>Roter 90°</button>
          {l.type === 'bilde' && (
            <>
              <button type="button" className="studio-knapp" onClick={() => tilpass(true)}><Ikon navn="fyll" /> Fyll hele</button>
              <button type="button" className="studio-knapp" onClick={() => tilpass(false)}><Ikon navn="tilpass" /> Tilpass</button>
            </>
          )}
        </div>
      )}
      {l.type === 'tegning' && (
        <p className="text-xs text-white/55">Dra tegningen for å flytte den. Vil du tegne mer, trykk «Tegn».</p>
      )}
    </div>
  );
}

/** To eller flere knapper side om side – velg én. */
function Valg({ verdi, valg, onVelg }: { verdi: string; valg: [string, string][]; onVelg: (v: string) => void }) {
  return (
    <div className="grid gap-1 rounded-xl border border-white/10 bg-white/[.03] p-1" style={{ gridTemplateColumns: `repeat(${valg.length}, minmax(0, 1fr))` }} role="radiogroup">
      {valg.map(([v, navn]) => (
        <button key={v} type="button" role="radio" aria-checked={verdi === v} onClick={() => onVelg(v)}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${verdi === v ? 'bg-cyan-400/15 text-white shadow-[0_0_0_1px_rgba(34,211,238,.5)]' : 'text-white/60 hover:text-white'}`}>
          {navn}
        </button>
      ))}
    </div>
  );
}

function Glider({
  etikett, verdi, min, maks, steg, enhet, onChange,
}: { etikett: string; verdi: number; min: number; maks: number; steg: number; enhet: string; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-1 items-center gap-3">
      <span className="studio-etikett w-[4.5rem] shrink-0">{etikett}</span>
      <input type="range" min={min} max={maks} step={steg} value={verdi}
        onChange={(e) => onChange(Number(e.target.value))} className="studio-glider flex-1" />
      <span className="w-16 text-right font-mono text-xs tabular-nums text-cyan-300">
        {(Number.isInteger(verdi) ? String(verdi) : verdi.toFixed(1)).replace('.', ',')} {enhet}
      </span>
    </label>
  );
}
