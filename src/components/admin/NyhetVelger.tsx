'use client';

/**
 * Velg hva som er «Nyhet» – ett produkt eller et tema – og som da vises
 * høyt oppe på forsiden og i galleriet. Lagres i innstillingene (nyhet_*).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdmin } from './AdminProvider';
import { TEMAER, temaFor, type TemaId } from '@/lib/temaer';
import { TemaIkon } from '@/components/TemaPynt';
import type { NyhetType } from '@/lib/nyhet';

type Prod = { id: string; code: string | null; name: string; image_url: string | null; active: boolean; category: string | null };
type Verdier = { nyhet_type: NyhetType; nyhet_verdi: string; nyhet_tittel: string; nyhet_tekst: string; nyhet_etikett: string };

const NOKLER: (keyof Verdier)[] = ['nyhet_type', 'nyhet_verdi', 'nyhet_tittel', 'nyhet_tekst', 'nyhet_etikett'];
const ETIKETTER: Record<keyof Verdier, string> = {
  nyhet_type: 'Nyhet: hva som vises',
  nyhet_verdi: 'Nyhet: produkt-ID eller tema',
  nyhet_tittel: 'Nyhet: overskrift',
  nyhet_tekst: 'Nyhet: kort tekst',
  nyhet_etikett: 'Nyhet: merkelapp',
};

export function NyhetVelger() {
  const { supabase } = useAdmin();
  const [v, setV] = useState<Verdier>({ nyhet_type: 'av', nyhet_verdi: '', nyhet_tittel: '', nyhet_tekst: '', nyhet_etikett: '' });
  const [produkter, setProdukter] = useState<Prod[]>([]);
  const [status, setStatus] = useState<'' | 'lagrer' | 'lagret' | 'feil'>('');
  const [feil, setFeil] = useState('');
  const [lastet, setLastet] = useState(false);
  const timer = useRef<number | null>(null);

  const hent = useCallback(async () => {
    if (!supabase) return;
    const [s, p] = await Promise.all([
      supabase.from('settings').select('key,value').in('key', NOKLER),
      supabase.from('products').select('id,code,name,image_url,active,category').order('sort').order('name'),
    ]);
    const ny = { ...v };
    for (const rad of (s.data as { key: keyof Verdier; value: string }[]) ?? []) (ny as Record<string, string>)[rad.key] = rad.value ?? '';
    if (!['av', 'produkt', 'tema'].includes(ny.nyhet_type)) ny.nyhet_type = 'av';
    setV(ny);
    setProdukter((p.data as Prod[]) ?? []);
    setLastet(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);
  useEffect(() => { hent(); }, [hent]);

  const lagre = useCallback(
    async (ny: Partial<Verdier>) => {
      if (!supabase) return;
      setStatus('lagrer');
      setFeil('');
      for (const [key, value] of Object.entries(ny)) {
        const nu = new Date().toISOString();
        const { data, error } = await supabase.from('settings').update({ value, updated_at: nu }).eq('key', key).select('key');
        let e = error;
        if (!e && (!data || data.length === 0)) {
          // raden finnes ikke ennå – lag den
          const r = await supabase.from('settings').insert({
            key, value, label: ETIKETTER[key as keyof Verdier], help: '', type: 'text', gruppe: 'Nyhet', sort: 90,
          });
          e = r.error;
        }
        if (e) {
          setStatus('feil');
          setFeil('Klarte ikke å lagre. Kjør nyhet.sql i Supabase og prøv igjen.');
          return;
        }
      }
      setStatus('lagret');
      window.setTimeout(() => setStatus(''), 1600);
    },
    [supabase]
  );

  function endre(ny: Partial<Verdier>, straks = true) {
    setV((gml) => ({ ...gml, ...ny }));
    if (timer.current) window.clearTimeout(timer.current);
    if (straks) lagre(ny);
    else { setStatus('lagrer'); timer.current = window.setTimeout(() => lagre(ny), 700); }
  }

  const valgtProdukt = v.nyhet_type === 'produkt'
    ? produkter.find((p) => (p.code ?? '').toLowerCase() === v.nyhet_verdi.toLowerCase() || p.id === v.nyhet_verdi)
    : undefined;
  const valgtTema = v.nyhet_type === 'tema' ? TEMAER.find((t) => t.id === v.nyhet_verdi) : undefined;
  const standardTittel = valgtProdukt?.name ?? valgtTema?.tittel ?? '';
  const iTema = (id: TemaId) => produkter.filter((p) => p.active && temaFor(p.category)?.id === id).length;

  return (
    <section className="rounded-3xl border border-brand-200 bg-gradient-to-br from-white to-brand-50/60 p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white">Nyhet</span>
            Løft noe høyt opp på nettsiden
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-600">
            Velg ett produkt eller et tema. Det vises rett under toppen av forsiden, og øverst i galleriet.
          </p>
        </div>
        <span className={`text-xs font-semibold ${status === 'feil' ? 'text-red-600' : 'text-ink-400'}`}>
          {status === 'lagrer' ? 'Lagrer …' : status === 'lagret' ? 'Lagret ✓' : status === 'feil' ? 'Ikke lagret' : ''}
        </span>
      </div>

      <div className="mt-4 inline-flex rounded-full border border-ink-200 bg-ink-50 p-1" role="radiogroup" aria-label="Hva skal være nyhet">
        {([['av', 'Ingen'], ['produkt', 'Et produkt'], ['tema', 'Et tema']] as const).map(([t, navn]) => (
          <button key={t} type="button" role="radio" aria-checked={v.nyhet_type === t} disabled={!lastet}
            onClick={() => endre({ nyhet_type: t, ...(t !== v.nyhet_type ? { nyhet_verdi: t === 'tema' ? 'jul' : '' } : {}) })}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${v.nyhet_type === t ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-white'}`}>
            {navn}
          </button>
        ))}
      </div>

      {v.nyhet_type === 'produkt' && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {valgtProdukt?.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={valgtProdukt.image_url} alt="" className="h-14 w-14 rounded-xl border border-ink-100 object-cover" />
          )}
          <select className="field max-w-md flex-1" value={valgtProdukt ? (valgtProdukt.code || valgtProdukt.id) : ''}
            onChange={(e) => endre({ nyhet_verdi: e.target.value })} aria-label="Produkt">
            <option value="">Velg et produkt …</option>
            {produkter.map((p) => (
              <option key={p.id} value={p.code || p.id}>
                {p.name}{p.code && p.code !== 'deksel' ? ` (ID ${p.code})` : ''}{p.active ? '' : ' – skjult'}
              </option>
            ))}
          </select>
          {valgtProdukt && !valgtProdukt.active && (
            <p className="w-full text-xs font-semibold text-amber-700">Produktet er skjult i galleriet, så nyheten vises ikke før du slår det på.</p>
          )}
        </div>
      )}

      {v.nyhet_type === 'tema' && (
        <div className="mt-4 grid max-w-xl gap-3 sm:grid-cols-2">
          {TEMAER.map((t) => {
            const valgt = v.nyhet_verdi === t.id;
            const n = iTema(t.id);
            return (
              <button key={t.id} type="button" onClick={() => endre({ nyhet_verdi: t.id })} aria-pressed={valgt}
                className={`tema-seksjon flex items-center gap-3 rounded-2xl p-4 text-left transition-all ${t.seksjon} ${valgt ? 'ring-4 ring-brand-300' : 'opacity-75 hover:opacity-100'}`}>
                <span className={`grid h-10 w-10 place-items-center rounded-full ${t.hjorneMerke}`}><TemaIkon tema={t.id} className="h-5 w-5" /></span>
                <span>
                  <span className={`block text-lg font-bold ${t.tittelFarge}`}>{t.tittel}</span>
                  <span className={`block text-xs ${t.tekstFarge}`}>{n} {n === 1 ? 'modell' : 'modeller'} i kategorien</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {v.nyhet_type !== 'av' && (
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_180px]">
          <label className="block">
            <span className="label">Overskrift</span>
            <input className="field" value={v.nyhet_tittel} placeholder={standardTittel || 'Standard: navnet'}
              onChange={(e) => endre({ nyhet_tittel: e.target.value }, false)} />
          </label>
          <label className="block">
            <span className="label">Kort tekst</span>
            <input className="field" value={v.nyhet_tekst} placeholder="Standard: undertittelen"
              onChange={(e) => endre({ nyhet_tekst: e.target.value }, false)} />
          </label>
          <label className="block">
            <span className="label">Merkelapp</span>
            <input className="field" value={v.nyhet_etikett} placeholder="Nyhet" maxLength={24}
              onChange={(e) => endre({ nyhet_etikett: e.target.value }, false)} />
          </label>
          <p className="hint sm:col-span-3">
            La feltene stå tomme for å bruke det som står på produktet/temaet. Merkelappen kan f.eks. være «Nyhet», «Nytt i butikken» eller «Kun nå».
          </p>
        </div>
      )}

      {feil && <p className="mt-3 text-sm font-semibold text-red-600">{feil}</p>}
      <p className="mt-4 text-xs text-ink-500">
        Endringen vises på nettsiden når dere trykker <span className="font-semibold text-ink-700">Publiser</span> øverst.
      </p>
    </section>
  );
}
