'use client';

import { useState } from 'react';
import { useAdmin } from './AdminProvider';
import { DekselMiniatyr } from '@/components/DekselMiniatyr';
import type { Analyse } from '@/lib/deksel/analyse';
import innebygde from '@/lib/deksel/innebygde.json';

type DekselDesign = {
  modellId: string;
  modellNavn: string;
  farger: { navn: string; hex: string }[];
  bilde: string;
  ramme: { u0: number; v0: number; skala: number; bredde: number; hoyde: number } | null;
  silhuett: string;
};

export function erDekselDesign(d: unknown): d is DekselDesign {
  return !!d && typeof d === 'object' && typeof (d as DekselDesign).bilde === 'string' && !!(d as DekselDesign).ramme;
}

/** Kundens dekseldesign i en bestilling – med knapp for å lage printfila. */
export function DekselPrintfil({ design, ordrenr }: { design: DekselDesign; ordrenr: string }) {
  const { supabase } = useAdmin();
  const [status, setStatus] = useState('');
  const [feil, setFeil] = useState('');
  const [filer, setFiler] = useState<{ tremf: Blob; stl: Blob; navn: string } | null>(null);

  async function lag(type: '3mf' | 'stl') {
    if (!supabase || !design.ramme) return;
    const n = await import('@/lib/deksel/nettleser');
    if (filer) {
      n.lastNed(type === '3mf' ? filer.tremf : filer.stl, `${filer.navn}.${type === '3mf' ? '3mf' : 'zip'}`);
      return;
    }
    setFeil('');
    setStatus('Henter dekselmodellen …');
    try {
      const data = await hentModell(supabase, design.modellId);
      setStatus('Lager printfila – tar noen sekunder …');
      const d = await n.lesDesign(design.bilde, design.farger, design.ramme);
      const res = await n.lagPrintfiler({
        modellUrl: data.fil_url,
        modellFilnavn: data.fil_navn || data.fil_url,
        analyse: data.analyse as Analyse,
        design: d,
        tittel: `#${ordrenr} ${design.modellNavn}`,
      });
      const navn = `deksel-${ordrenr || 'bestilling'}-${n.filnavn(design.modellNavn)}`;
      setFiler({ tremf: res.tremf, stl: res.stl, navn });
      n.lastNed(type === '3mf' ? res.tremf : res.stl, `${navn}.${type === '3mf' ? '3mf' : 'zip'}`);
      setStatus(`Ferdig: ${res.resultat.deler.length} deler – ${res.resultat.deler.map((x) => `${x.filament} ${x.navn.replace('Motiv – ', '')}`).join(', ')}`);
    } catch (e) {
      setStatus('');
      setFeil(e instanceof Error ? e.message : 'Klarte ikke å lage printfila.');
    }
  }

  return (
    <div className="mt-2 flex w-full gap-4 rounded-2xl bg-ink-50 p-3">
      {design.ramme && (
        <a href={design.bilde} target="_blank" rel="noreferrer" title="Åpne designet" className="shrink-0">
          <DekselMiniatyr
            silhuett={design.silhuett}
            dekselfarge={design.farger[0]?.hex ?? '#fff'}
            design={design.bilde}
            ramme={design.ramme}
            className="h-28 w-auto"
          />
        </a>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-800">{design.modellNavn}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {design.farger.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-600">
              <span className="h-3 w-3 rounded-full border border-black/10" style={{ background: f.hex }} />
              {i === 0 ? `Deksel: ${f.navn}` : f.navn}
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => lag('3mf')} disabled={!!status && !filer} className="btn-primary btn-sm disabled:opacity-60">
            Last ned printfil (3MF)
          </button>
          <button type="button" onClick={() => lag('stl')} disabled={!!status && !filer} className="btn-ghost btn-sm disabled:opacity-60">
            STL-deler (reserve)
          </button>
        </div>
        {status && <p className="mt-2 text-xs font-semibold text-ink-500">{status}</p>}
        {feil && <p className="mt-2 text-xs font-semibold text-red-600">{feil}</p>}
      </div>
    </div>
  );
}

/** Mobilen bestillingen ble laget for – fra databasen, eller fra dekselfilene i GitHub (id «fil:…»). */
async function hentModell(supabase: NonNullable<ReturnType<typeof useAdmin>['supabase']>, id: string) {
  if (id.startsWith('fil:')) {
    const m = (innebygde as { id: string; fil_url: string; fil_navn: string; analyse_url: string }[]).find((x) => x.id === id);
    if (!m) throw new Error('Fant ikke dekselfila for denne mobilen. Ligger den fortsatt i GitHub?');
    const res = await fetch(m.analyse_url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Klarte ikke å hente analysen for ${m.fil_navn} (${res.status}).`);
    return { fil_url: m.fil_url, fil_navn: m.fil_navn, analyse: (await res.json()) as Analyse };
  }
  const { data, error } = await supabase
    .from('deksel_modeller')
    .select('fil_url,fil_navn,analyse:bakside')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) throw new Error('Fant ikke dekselmodellen. Er den slettet i Deksler?');
  return data as { fil_url: string; fil_navn: string | null; analyse: unknown };
}
