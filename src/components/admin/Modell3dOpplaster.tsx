'use client';

/** Last opp 3D-fila (STL/3MF) til en modell i galleriet – med forhåndsvisning. */
import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { useAdmin } from './AdminProvider';
import { MAKS_3D_MB, MODELL_3D_TYPER } from '@/lib/modell3d';

const Produkt3D = dynamic(() => import('@/components/Produkt3D').then((m) => m.Produkt3D), { ssr: false });

const BOTTE = 'produktmodeller';

function stiFraUrl(url: string): string | null {
  const m = url.match(/\/storage\/v1\/object\/public\/produktmodeller\/(.+)$/);
  return m ? decodeURIComponent(m[1].split('?')[0]) : null;
}

export function Modell3dOpplaster({
  verdi,
  rad,
  onEndre,
}: {
  verdi: unknown;
  rad: Record<string, unknown>;
  onEndre: (verdi: unknown, straks?: boolean) => void;
}) {
  const { supabase } = useAdmin();
  const url = typeof verdi === 'string' ? verdi : '';
  const inputRef = useRef<HTMLInputElement>(null);
  const [laster, setLaster] = useState(false);
  const [feil, setFeil] = useState('');
  const [over, setOver] = useState(false);
  const [forhand, setForhand] = useState(false);

  const filnavn = url ? decodeURIComponent(url.split('?')[0].split('/').pop() || '').replace(/^\d+-[a-z0-9]{6}-/, '') : '';

  async function lastOpp(fil: File | undefined) {
    if (!fil || !supabase) return;
    setFeil('');
    if (!MODELL_3D_TYPER.test(fil.name)) { setFeil('Velg en STL- eller 3MF-fil.'); return; }
    if (fil.size > MAKS_3D_MB * 1024 * 1024) { setFeil(`Fila er for stor (maks ${MAKS_3D_MB} MB). Prøv å eksportere med færre trekanter.`); return; }
    setLaster(true);
    const ren = fil.name.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').toLowerCase();
    const sti = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${ren}`;
    const { error } = await supabase.storage.from(BOTTE).upload(sti, fil, {
      cacheControl: '31536000',
      upsert: false,
      contentType: /\.3mf$/i.test(fil.name) ? 'model/3mf' : 'model/stl',
    });
    if (error) {
      setLaster(false);
      setFeil(/bucket/i.test(error.message)
        ? 'Lagringsplassen for 3D-filer finnes ikke ennå. Kjør SQL-en for 3D-visning i Supabase først.'
        : `Klarte ikke å laste opp fila: ${error.message}`);
      return;
    }
    const gammel = url ? stiFraUrl(url) : null;
    onEndre(supabase.storage.from(BOTTE).getPublicUrl(sti).data.publicUrl, true);
    if (gammel) await supabase.storage.from(BOTTE).remove([gammel]);
    setLaster(false);
    setForhand(true);
  }

  async function fjern() {
    if (!supabase || !url) return;
    const gammel = stiFraUrl(url);
    onEndre('', true);
    setForhand(false);
    if (gammel) await supabase.storage.from(BOTTE).remove([gammel]);
  }

  return (
    <div>
      <span className="label">3D-fil</span>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); lastOpp(e.dataTransfer.files[0]); }}
        className={`rounded-2xl border-2 border-dashed p-4 transition-colors ${over ? 'border-brand-400 bg-brand-50' : 'border-ink-200 bg-ink-50/50'}`}
      >
        {url ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 2.8 20 7v10l-8 4.2L4 17V7z M12 12l8-5m-8 5-8-5m8 5v9.2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-800">{filnavn || '3D-fil'}</p>
              <p className="text-xs text-ink-500">
                {rad.vis_3d ? 'Kundene ser «Se i 3D» på produktsiden.' : 'Slå på «Vis «Se i 3D» på produktsiden» under for at kundene skal se den.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setForhand((v) => !v)} className="btn-ghost btn-sm">
                {forhand ? 'Skjul' : 'Forhåndsvis'}
              </button>
              <button type="button" onClick={() => inputRef.current?.click()} disabled={laster} className="btn-ghost btn-sm disabled:opacity-60">
                Bytt fil
              </button>
              <button type="button" onClick={fjern} className="btn btn-sm border border-red-200 bg-white text-red-600 hover:bg-red-50">
                Fjern
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-600">
              Dra en <b>STL</b>- eller <b>3MF</b>-fil hit, eller trykk på knappen. Maks {MAKS_3D_MB} MB.
            </p>
            <button type="button" onClick={() => inputRef.current?.click()} disabled={laster} className="btn-primary btn-sm disabled:opacity-60">
              {laster ? 'Laster opp …' : 'Last opp 3D-fil'}
            </button>
          </div>
        )}
        {laster && url && <p className="mt-2 text-xs font-semibold text-ink-500">Laster opp …</p>}
        {feil && <p className="mt-2 text-xs font-semibold text-red-600">{feil}</p>}
        <input
          ref={inputRef}
          type="file"
          accept=".stl,.3mf,model/stl,model/3mf"
          className="hidden"
          onChange={(e) => { lastOpp(e.target.files?.[0]); e.target.value = ''; }}
        />
      </div>
      {url && forhand && (
        <div className="relative mt-3 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-ink-100 bg-gradient-to-br from-brand-50 to-brand-100">
          <Produkt3D url={url} farge={typeof rad.modell_3d_farge === 'string' ? rad.modell_3d_farge : undefined} navn={String(rad.name ?? '')} />
        </div>
      )}
      <p className="hint">Kunden kan snu og zoome modellen på produktsiden. Fargen velger du under.</p>
    </div>
  );
}
