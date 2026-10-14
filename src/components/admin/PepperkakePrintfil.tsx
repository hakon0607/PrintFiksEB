'use client';

/** Kundens tegnede pepperkakeform i en bestilling – med knapp for å laste ned STL. */
import { useState } from 'react';
import { PepperkakeMiniatyr } from '@/components/pepperkake/Miniatyr';
import { rensForm, type Pkt } from '@/lib/pepperkake/sti';

type PepperkakeDesign = { type: 'pepperkake'; punkter: Pkt[]; lukket: boolean; bredde?: number; hoyde?: number };

export function erPepperkakeDesign(d: unknown): d is PepperkakeDesign {
  return !!d && typeof d === 'object' && (d as PepperkakeDesign).type === 'pepperkake' && Array.isArray((d as PepperkakeDesign).punkter);
}

const cm = (mm: number) => (mm / 10).toFixed(1).replace('.', ',');

export function PepperkakePrintfil({ design, ordrenr, antall }: { design: PepperkakeDesign; ordrenr: string; antall: number }) {
  const [status, setStatus] = useState('');
  const [feil, setFeil] = useState('');

  async function lastNed() {
    setFeil('');
    setStatus('Lager modellen …');
    try {
      const form = rensForm(design);
      if (!form) throw new Error('Tegningen mangler eller er ødelagt.');
      const [{ byggPepperkakeform }, { tilStl }] = await Promise.all([
        import('@/lib/pepperkake/nettleser'),
        import('@/lib/pepperkake/modell'),
      ]);
      const { nett } = await byggPepperkakeform(form);
      const stl = tilStl(nett);
      const url = URL.createObjectURL(new Blob([stl.buffer as ArrayBuffer], { type: 'model/stl' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `pepperkakeform-${ordrenr || 'bestilling'}.stl`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      setStatus('');
    } catch (e) {
      setStatus('');
      setFeil(e instanceof Error ? e.message : 'Klarte ikke å lage STL-fila.');
    }
  }

  return (
    <div className="mt-2 flex w-full gap-4 rounded-2xl bg-ink-50 p-3">
      <div className="grid h-24 w-24 shrink-0 place-items-center rounded-xl bg-white">
        <PepperkakeMiniatyr punkter={design.punkter} lukket={design.lukket} className="h-20 w-20" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-800">Pepperkakeform · hvit</p>
        <p className="mt-0.5 text-xs text-ink-500">
          {design.bredde && design.hoyde ? `${cm(design.bredde)} × ${cm(design.hoyde)} cm · ` : ''}15 mm høy ·{' '}
          {design.lukket ? 'lukket form' : 'åpen form'}
          {antall > 1 ? ` · print ${antall} stk` : ''}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={lastNed} disabled={!!status} className="btn-primary btn-sm disabled:opacity-60">
            Last ned STL
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-400">
          Printes i hvit med den brede kanten ned mot plata, ingen support. Formen ser speilvendt ut i sliceren – det er
          riktig: når den snus og trykkes i deigen, blir kaka lik tegningen.
        </p>
        {status && <p className="mt-1 text-xs font-semibold text-ink-500">{status}</p>}
        {feil && <p className="mt-1 text-xs font-semibold text-red-600">{feil}</p>}
      </div>
    </div>
  );
}
