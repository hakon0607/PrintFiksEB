'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from './AdminProvider';
import type { Analyse } from '@/lib/deksel/analyse';
import { STANDARD_FILAMENTER } from '@/lib/deksel/farger';
import { navnFraFil, rangering } from '@/lib/deksel/modellnavn';
import { DekselMiniatyr as Miniatyr } from './DekselMiniatyr';
import { DekselMasseopplasting } from './DekselMasseopplasting';
import innebygde from '@/lib/deksel/innebygde.json';

type Modell = {
  id: string;
  navn: string;
  aktiv: boolean;
  sort: number;
  fil_url: string;
  fil_navn: string | null;
  analyse: Analyse | null;
};

const BOTTE = 'dekselmodeller';

export function DekselModeller() {
  const { supabase } = useAdmin();
  const [modeller, setModeller] = useState<Modell[]>([]);
  const [laster, setLaster] = useState(true);
  const [mangler, setMangler] = useState(false);

  // ny modell
  const [navn, setNavn] = useState('');
  const [fil, setFil] = useState<File | null>(null);
  const [analyse, setAnalyse] = useState<Analyse | null>(null);
  const [jobber, setJobber] = useState('');
  const [feil, setFeil] = useState('');

  const hent = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('deksel_modeller')
      .select('id,navn,aktiv,sort,fil_url,fil_navn,analyse:bakside')
      .order('sort')
      .order('navn');
    if (error) { setMangler(true); setLaster(false); return; }
    setMangler(false);
    setModeller((data as Modell[]) ?? []);
    setLaster(false);
  }, [supabase]);

  useEffect(() => { hent(); }, [hent]);

  async function velgFil(f: File | undefined) {
    if (!f) return;
    setFil(f);
    setAnalyse(null);
    setFeil('');
    if (!navn) setNavn(navnFraFil(f.name));
    setJobber('Finner baksiden, kamerahullet og den trygge sonen …');
    try {
      const { analyserFil } = await import('@/lib/deksel/nettleser');
      const { analyse } = await analyserFil(f);
      setAnalyse(analyse);
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Klarte ikke å lese fila.');
    }
    setJobber('');
  }

  async function lagre() {
    if (!supabase || !fil || !analyse || !navn.trim()) return;
    setJobber('Laster opp …');
    setFeil('');
    const endelse = (fil.name.split('.').pop() || 'stl').toLowerCase();
    const sti = `${navn.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.${endelse}`;
    const { error: e1 } = await supabase.storage.from(BOTTE).upload(sti, fil, { upsert: false, cacheControl: '3600' });
    if (e1) { setFeil(`Opplastingen feilet: ${e1.message}`); setJobber(''); return; }
    const url = supabase.storage.from(BOTTE).getPublicUrl(sti).data.publicUrl;
    const { error: e2 } = await supabase.from('deksel_modeller').insert({
      navn: navn.trim(),
      fil_url: url,
      fil_navn: fil.name,
      bakside: analyse,
      sort: rangering(navn.trim()),
    });
    if (e2) { setFeil(`Klarte ikke å lagre: ${e2.message}`); setJobber(''); return; }
    setNavn(''); setFil(null); setAnalyse(null); setJobber('');
    hent();
  }

  async function oppdater(id: string, patch: Partial<Modell>) {
    if (!supabase) return;
    setModeller((p) => p.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    await supabase.from('deksel_modeller').update(patch).eq('id', id);
  }

  const [sorterer, setSorterer] = useState(false);
  async function sorterAlle() {
    if (!supabase) return;
    setSorterer(true);
    const nye = modeller.map((m) => ({ ...m, sort: rangering(m.navn) }));
    for (const m of nye) await supabase.from('deksel_modeller').update({ sort: m.sort }).eq('id', m.id);
    setSorterer(false);
    hent();
  }

  async function slett(m: Modell) {
    if (!supabase) return;
    if (!window.confirm(`Slette ${m.navn}? Bestillinger som alt er lagt inn med denne modellen, kan da ikke lage printfil.`)) return;
    await supabase.from('deksel_modeller').delete().eq('id', m.id);
    const sti = m.fil_url.split(`/${BOTTE}/`)[1];
    if (sti) await supabase.storage.from(BOTTE).remove([decodeURIComponent(sti)]);
    hent();
  }

  async function testfil(m: Modell) {
    if (!m.analyse) return;
    setJobber(`Lager testfil for ${m.navn} …`);
    try {
      const n = await import('@/lib/deksel/nettleser');
      const farger = STANDARD_FILAMENTER.filter((f) => ['hvit', 'svart', 'bla'].includes(f.id)).map((f) => ({ navn: f.navn, hex: f.hex }));
      const filer = await n.lagPrintfiler({
        modellUrl: m.fil_url,
        modellFilnavn: m.fil_navn || m.fil_url,
        analyse: m.analyse,
        design: n.testDesign(m.analyse, farger),
        tittel: `Test – ${m.navn}`,
      });
      n.lastNed(filer.tremf, `test-${n.filnavn(m.navn)}.3mf`);
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Klarte ikke å lage testfila.');
    }
    setJobber('');
  }

  if (mangler) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm leading-relaxed text-amber-900">
        Dekselgeneratoren er ikke satt opp i databasen ennå. Kjør <span className="font-mono">supabase/deksel.sql</span> i
        Supabase → SQL Editor, og last siden på nytt.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---------- Fra GitHub ---------- */}
      <FraGithub iDb={modeller.map((m) => m.navn)} />

      {/* ---------- Mange på en gang ---------- */}
      <DekselMasseopplasting supabase={supabase} eksisterende={modeller} ferdig={hent} />

      {/* ---------- Legg til én ---------- */}
      <details className="group rounded-3xl border border-ink-100 bg-white p-6 shadow-soft">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-lg font-bold">
          Legg til én mobil
          <span className="text-sm font-semibold text-ink-400 transition-transform group-open:rotate-180" aria-hidden>▾</span>
        </summary>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-600">
          Last opp dekselet som 3MF fra Bambu Studio eller som STL – med <b>baksiden ned mot plata</b>. Siden finner
          selv baksiden, kamerahullet og hvor motivet trygt kan ligge. Dere trenger ikke stille inn noe.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Navn kunden ser</span>
            <input value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="F.eks. iPhone 16 Pro" className="field" />
          </label>
          <label className="block">
            <span className="label">Dekselfil (.3mf eller .stl)</span>
            <input type="file" accept=".3mf,.stl" onChange={(e) => velgFil(e.target.files?.[0])}
              className="field file:mr-3 file:rounded-full file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-brand-700" />
          </label>
        </div>

        {jobber && <p className="mt-4 rounded-xl bg-ink-50 px-4 py-2.5 text-sm font-semibold text-ink-600">{jobber}</p>}
        {feil && <p className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">{feil}</p>}

        {analyse && (
          <div className="mt-5 grid gap-5 rounded-2xl border border-ink-100 bg-ink-50/60 p-5 sm:grid-cols-[160px_1fr]">
            <Miniatyr a={analyse} visTrygg className="mx-auto h-56 w-auto" />
            <div className="text-sm text-ink-700">
              <p className="font-semibold text-emerald-700">Fant baksiden ✓</p>
              <ul className="mt-2 space-y-1">
                <li>Mål: {tall(analyse.bredde)} × {tall(analyse.hoyde)} mm</li>
                <li>Baksiden er ca. {tall(analyse.tykkelse)} mm tykk – motivet legges {tall(analyse.dybde)} mm inn</li>
                <li>{analyse.hull.length} hull i baksiden (kamera o.l.)</li>
                <li>Den blå stiplede linjen er der motivet kan ligge</li>
              </ul>
              <p className="mt-3 text-xs text-ink-500">
                Står kameraet feil vei eller ser omrisset rart ut? Sjekk at baksiden ligger ned mot plata i fila.
              </p>
              <button type="button" onClick={lagre} disabled={!navn.trim() || !!jobber} className="btn-primary btn-sm mt-4 disabled:opacity-50">
                Lagre {navn.trim() || 'modellen'}
              </button>
            </div>
          </div>
        )}
      </details>

      {/* ---------- Modellene ---------- */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Mobilene i generatoren{modeller.length > 0 && <span className="ml-2 text-sm font-semibold text-ink-400">{modeller.length}</span>}</h2>
          {modeller.length > 1 && (
            <button type="button" onClick={sorterAlle} disabled={sorterer} className="btn-ghost btn-sm disabled:opacity-50">
              {sorterer ? 'Sorterer …' : 'Sorter etter modell (nyeste først)'}
            </button>
          )}
        </div>
        {laster ? (
          <div className="mt-4 h-40 animate-pulse rounded-3xl bg-white/70" />
        ) : modeller.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-ink-200 bg-white/70 px-5 py-8 text-center text-sm text-ink-500">
            Ingen mobiler ennå. Slipp dekselfilene i feltet over.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {modeller.map((m) => (
              <div key={m.id} className={`rounded-3xl border bg-white p-5 shadow-soft ${m.aktiv ? 'border-ink-100' : 'border-dashed border-ink-200 opacity-70'}`}>
                <div className="flex gap-4">
                  {m.analyse && <Miniatyr a={m.analyse} className="h-32 w-auto shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <input defaultValue={m.navn} onBlur={(e) => e.target.value.trim() && e.target.value !== m.navn && oppdater(m.id, { navn: e.target.value.trim() })}
                      className="w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-base font-bold hover:border-ink-200 focus:border-brand-300 focus:outline-none" aria-label="Navn" />
                    {m.analyse && (
                      <p className="mt-1 px-1 text-xs text-ink-500">
                        {Math.round(m.analyse.bredde)} × {Math.round(m.analyse.hoyde)} mm · innlegg {tall(m.analyse.dybde)} mm
                      </p>
                    )}
                    <p className="mt-0.5 truncate px-1 text-xs text-ink-400">{m.fil_navn}</p>
                    <button type="button" onClick={() => oppdater(m.id, { aktiv: !m.aktiv })}
                      className={`mt-3 rounded-full px-3 py-1 text-xs font-bold ${m.aktiv ? 'bg-emerald-50 text-emerald-700' : 'bg-ink-100 text-ink-500'}`}>
                      {m.aktiv ? 'Synlig for kunder' : 'Skjult'}
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-100 pt-3">
                  <button type="button" onClick={() => testfil(m)} disabled={!!jobber} className="btn-ghost btn-sm">
                    Last ned testfil
                  </button>
                  <button type="button" onClick={() => slett(m)} className="btn btn-sm border border-red-200 bg-white text-red-600 hover:bg-red-50">
                    Slett
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-ink-500">
          «Last ned testfil» lager et deksel med en svart sirkel og en blå stripe. Åpne den i Bambu Studio og sjekk at
          alt ser riktig ut før dere viser modellen til kunder.
        </p>
      </section>
    </div>
  );
}

function tall(n: number) {
  return n.toLocaleString('nb-NO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Mobilene som kommer fra dekselfilene i GitHub-repoet (samles automatisk ved hver publisering). */
function FraGithub({ iDb }: { iDb: string[] }) {
  const liste = innebygde as { id: string; navn: string; fil_navn: string }[];
  const db = new Set(iDb.map((n) => n.trim().toLowerCase()));
  return (
    <section className="rounded-3xl border border-ink-100 bg-white p-6 shadow-soft">
      <h2 className="text-lg font-bold">
        Fra GitHub <span className="ml-1 text-sm font-semibold text-ink-400">{liste.length}</span>
      </h2>
      {liste.length === 0 ? (
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-600">
          Ingen dekselfiler funnet i repoet ennå. Last opp filer som <span className="font-mono text-xs">iphone-16-pro.stl</span> eller{' '}
          <span className="font-mono text-xs">galaxy-s25-ultra.stl</span> til GitHub (hvilken som helst mappe) – de dukker opp her og i
          dekselstudioet etter neste publisering.
        </p>
      ) : (
        <>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-600">
            Disse hentes automatisk fra dekselfilene i GitHub, med navn og rekkefølge fra filnavnet. Nye filer kommer med ved neste
            publisering. Har en mobil samme navn i databasen under, brukes den i stedet.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {liste.map((m) => (
              <span key={m.id} title={m.fil_navn}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${db.has(m.navn.trim().toLowerCase()) ? 'border-ink-200 text-ink-400 line-through' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                {m.navn}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
