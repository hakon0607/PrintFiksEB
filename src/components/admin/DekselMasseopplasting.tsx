'use client';

/**
 * Legg inn mange mobilmodeller på én gang: slipp en mappe med STL/3MF-filer eller en
 * hel .zip. Navnet gjettes fra filnavnet (iphone-16-pro-max.stl -> «iPhone 16 Pro Max»),
 * hver fil analyseres i nettleseren, og alt lagres med ett trykk.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { unzipSync } from 'fflate';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Analyse } from '@/lib/deksel/analyse';
import { navnFraFil, rangering } from '@/lib/deksel/modellnavn';
import { DekselMiniatyr } from './DekselMiniatyr';

export type EksisterendeModell = { id: string; navn: string; fil_url: string };

type Handling = 'ny' | 'erstatt' | 'hopp';
type Status = 'venter' | 'analyserer' | 'klar' | 'feil' | 'lagrer' | 'lagret';
type Rad = {
  id: number;
  fil: File;
  navn: string;
  status: Status;
  analyse: Analyse | null;
  feil: string;
  handling: Handling;
};

const BOTTE = 'dekselmodeller';
const GYLDIG = /\.(stl|3mf)$/i;

function nokkel(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Pakker ut .zip og plukker STL/3MF-filene (hopper over macOS-rester). */
async function hentFiler(liste: FileList | File[]): Promise<File[]> {
  const ut: File[] = [];
  for (const f of Array.from(liste)) {
    if (/\.zip$/i.test(f.name)) {
      const innhold = unzipSync(new Uint8Array(await f.arrayBuffer()));
      for (const [sti, data] of Object.entries(innhold)) {
        const navn = sti.split('/').pop() || '';
        if (!GYLDIG.test(navn) || sti.includes('__MACOSX') || navn.startsWith('._') || data.length === 0) continue;
        ut.push(new File([data], navn));
      }
    } else if (GYLDIG.test(f.name)) {
      ut.push(f);
    }
  }
  return ut;
}

export function DekselMasseopplasting({
  supabase,
  eksisterende,
  ferdig,
}: {
  supabase: SupabaseClient | null;
  eksisterende: EksisterendeModell[];
  ferdig: () => void;
}) {
  const [rader, setRader] = useState<Rad[]>([]);
  const [drar, setDrar] = useState(false);
  const [lagrer, setLagrer] = useState(false);
  const [melding, setMelding] = useState('');
  const neste = useRef(1);
  const analyserer = useRef(false);
  const inn = useRef<HTMLInputElement>(null);

  const finnes = useCallback(
    (navn: string) => eksisterende.find((m) => nokkel(m.navn) === nokkel(navn)),
    [eksisterende]
  );

  function endre(id: number, patch: Partial<Rad>) {
    setRader((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function leggTil(liste: FileList | File[] | null) {
    if (!liste || liste.length === 0) return;
    setMelding('');
    let filer: File[];
    try {
      filer = await hentFiler(liste);
    } catch {
      setMelding('Klarte ikke å åpne zip-fila.');
      return;
    }
    if (filer.length === 0) {
      setMelding('Fant ingen .stl- eller .3mf-filer.');
      return;
    }
    setRader((gamle) => {
      const brukt = new Set(gamle.filter((r) => r.handling !== 'hopp').map((r) => nokkel(r.navn)));
      const nye = filer
        .map((fil) => ({ fil, navn: navnFraFil(fil.name) }))
        .sort((a, b) => rangering(a.navn) - rangering(b.navn))
        .map(({ fil, navn }): Rad => {
          const dobbel = brukt.has(nokkel(navn));
          brukt.add(nokkel(navn));
          return {
            id: neste.current++, fil, navn, status: 'venter', analyse: null,
            feil: dobbel ? 'Samme navn to ganger i lista' : '',
            handling: dobbel || finnes(navn) ? 'hopp' : 'ny',
          };
        });
      return [...gamle, ...nye];
    });
  }

  // Analyser én og én fil i bakgrunnen (WASM-tung, så ikke parallelt)
  useEffect(() => {
    if (analyserer.current) return;
    const rad = rader.find((r) => r.status === 'venter');
    if (!rad) return;
    analyserer.current = true;
    endre(rad.id, { status: 'analyserer' });
    (async () => {
      try {
        const { analyserFil } = await import('@/lib/deksel/nettleser');
        const { analyse } = await analyserFil(rad.fil);
        endre(rad.id, { status: 'klar', analyse });
      } catch (e) {
        endre(rad.id, { status: 'feil', feil: e instanceof Error ? e.message : 'Klarte ikke å lese fila.', handling: 'hopp' });
      }
      analyserer.current = false;
      setRader((p) => [...p]); // dytt i gang neste
    })();
  }, [rader]);

  async function lagreAlle() {
    if (!supabase) return;
    const valgt = rader.filter((r) => r.status === 'klar' && r.analyse && r.handling !== 'hopp' && r.navn.trim());
    if (valgt.length === 0) return;
    setLagrer(true);
    setMelding('');
    let ok = 0;
    for (const r of valgt) {
      endre(r.id, { status: 'lagrer' });
      const navn = r.navn.trim();
      const endelse = (r.fil.name.split('.').pop() || 'stl').toLowerCase();
      const sti = `${navn.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.${endelse}`;
      const { error: e1 } = await supabase.storage.from(BOTTE).upload(sti, r.fil, {
        upsert: false, cacheControl: '3600', contentType: 'application/octet-stream',
      });
      if (e1) { endre(r.id, { status: 'feil', feil: `Opplasting: ${e1.message}` }); continue; }
      const url = supabase.storage.from(BOTTE).getPublicUrl(sti).data.publicUrl;

      const gammel = r.handling === 'erstatt' ? finnes(navn) : undefined;
      const { error: e2 } = gammel
        ? await supabase.from('deksel_modeller').update({ fil_url: url, fil_navn: r.fil.name, bakside: r.analyse }).eq('id', gammel.id)
        : await supabase.from('deksel_modeller').insert({
            navn, fil_url: url, fil_navn: r.fil.name, bakside: r.analyse, sort: rangering(navn),
          });
      if (e2) {
        await supabase.storage.from(BOTTE).remove([sti]);
        endre(r.id, { status: 'feil', feil: `Lagring: ${e2.message}` });
        continue;
      }
      if (gammel) {
        const gammelSti = gammel.fil_url.split(`/${BOTTE}/`)[1];
        if (gammelSti) await supabase.storage.from(BOTTE).remove([decodeURIComponent(gammelSti)]);
      }
      endre(r.id, { status: 'lagret', handling: 'hopp' });
      ok++;
    }
    setLagrer(false);
    setMelding(`${ok} av ${valgt.length} modeller er lagret.`);
    ferdig();
  }

  const antall = rader.length;
  const analysert = rader.filter((r) => !['venter', 'analyserer'].includes(r.status)).length;
  const klare = rader.filter((r) => r.status === 'klar' && r.handling !== 'hopp' && r.navn.trim()).length;
  const jobber = analysert < antall;

  return (
    <section className="rounded-3xl border border-brand-200 bg-gradient-to-br from-white to-brand-50/50 p-6 shadow-soft">
      <h2 className="text-lg font-bold">Legg inn mange mobiler på en gang</h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-600">
        Slipp alle dekselfilene her – eller hele zip-fila. Navnet hentes fra filnavnet
        (<span className="font-mono text-xs">iphone-16-pro-max.stl</span> blir «iPhone 16 Pro Max»), og dere kan rette det før dere lagrer.
        Mobiler som alt finnes, hoppes over med mindre dere velger «Erstatt».
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrar(true); }}
        onDragLeave={() => setDrar(false)}
        onDrop={(e) => { e.preventDefault(); setDrar(false); leggTil(e.dataTransfer.files); }}
        onClick={() => inn.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inn.current?.click(); }}
        className={`mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          drar ? 'border-brand-500 bg-brand-50' : 'border-ink-200 bg-white/70 hover:border-brand-300'
        }`}
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden className="text-brand-600">
          <path d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-sm font-semibold text-ink-800">Slipp filer eller en .zip her</p>
        <p className="text-xs text-ink-500">eller klikk for å velge · .stl, .3mf og .zip · mange filer samtidig</p>
        <input ref={inn} type="file" multiple accept=".stl,.3mf,.zip" className="hidden"
          onChange={(e) => { leggTil(e.target.files); e.target.value = ''; }} />
      </div>

      {melding && <p className="mt-4 rounded-xl bg-ink-50 px-4 py-2.5 text-sm font-semibold text-ink-700">{melding}</p>}

      {antall > 0 && (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="h-2 min-w-[160px] flex-1 overflow-hidden rounded-full bg-ink-100">
              <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${(analysert / antall) * 100}%` }} />
            </div>
            <span className="text-xs font-semibold text-ink-500">
              {jobber ? `Analyserer ${analysert + 1} av ${antall} …` : `${antall} filer lest`}
            </span>
          </div>

          <ul className="mt-4 divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-white">
            {rader.map((r) => {
              const dublett = finnes(r.navn);
              return (
                <li key={r.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${r.handling === 'hopp' && r.status !== 'lagret' ? 'bg-ink-50/60' : ''}`}>
                  <div className="grid h-14 w-8 shrink-0 place-items-center">
                    {r.analyse ? <DekselMiniatyr a={r.analyse} className="h-14 w-auto" /> : <span className="h-10 w-6 animate-pulse rounded-md bg-ink-100" />}
                  </div>
                  <div className="min-w-[180px] flex-1">
                    <input value={r.navn} disabled={r.status === 'lagret' || lagrer}
                      onChange={(e) => endre(r.id, {
                        navn: e.target.value,
                        ...(r.handling === 'erstatt' && !finnes(e.target.value) ? { handling: 'ny' as Handling } : {}),
                      })}
                      className="w-full rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm font-semibold focus:border-brand-400 focus:outline-none disabled:border-transparent disabled:bg-transparent"
                      aria-label={`Navn for ${r.fil.name}`} />
                    <p className="mt-0.5 truncate px-1 text-xs text-ink-400">
                      {r.fil.name}
                      {r.analyse && ` · ${Math.round(r.analyse.bredde)} × ${Math.round(r.analyse.hoyde)} mm · ${r.analyse.hull.length} hull`}
                    </p>
                    {r.feil && <p className="mt-0.5 px-1 text-xs font-semibold text-red-600">{r.feil}</p>}
                  </div>
                  <Merke status={r.status} dublett={!!dublett && r.status !== 'lagret'} />
                  {r.status !== 'lagret' && r.status !== 'feil' && (
                    <select value={r.handling} disabled={lagrer}
                      onChange={(e) => endre(r.id, { handling: e.target.value as Handling })}
                      className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs font-semibold" aria-label="Hva skal skje">
                      {!dublett && <option value="ny">Legg til</option>}
                      {dublett && <option value="erstatt">Erstatt eksisterende</option>}
                      {dublett && <option value="ny">Legg til likevel</option>}
                      <option value="hopp">Hopp over</option>
                    </select>
                  )}
                  {!lagrer && r.status !== 'lagrer' && (
                    <button type="button" onClick={() => setRader((p) => p.filter((x) => x.id !== r.id))}
                      className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700" aria-label={`Fjern ${r.fil.name} fra lista`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={lagreAlle} disabled={lagrer || jobber || klare === 0} className="btn-primary disabled:opacity-50">
              {lagrer ? 'Lagrer …' : jobber ? 'Venter på analysen …' : `Lagre ${klare} ${klare === 1 ? 'modell' : 'modeller'}`}
            </button>
            <button type="button" onClick={() => { setRader([]); setMelding(''); }} disabled={lagrer} className="btn-ghost btn-sm">
              Tøm lista
            </button>
            <span className="text-xs text-ink-500">Nye modeller sorteres automatisk: iPhone først, så Samsung – nyeste øverst.</span>
          </div>
        </>
      )}
    </section>
  );
}

function Merke({ status, dublett }: { status: Status; dublett: boolean }) {
  const [tekst, farge] =
    status === 'lagret' ? ['Lagret ✓', 'bg-emerald-50 text-emerald-700']
    : status === 'lagrer' ? ['Lagrer …', 'bg-brand-50 text-brand-700']
    : status === 'feil' ? ['Feil', 'bg-red-50 text-red-700']
    : status === 'klar' ? (dublett ? ['Finnes alt', 'bg-amber-50 text-amber-800'] : ['Klar', 'bg-emerald-50 text-emerald-700'])
    : status === 'analyserer' ? ['Analyserer …', 'bg-brand-50 text-brand-700']
    : ['I kø', 'bg-ink-100 text-ink-500'];
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${farge}`}>{tekst}</span>;
}
