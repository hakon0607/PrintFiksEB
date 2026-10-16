'use client';

/** Liste over timelapser – velg hvilke som vises på nettsiden, gi dem navn, eller slett. */
import { useState } from 'react';
import { useAdmin } from '../AdminProvider';
import { kameraUrl, type Timelapse } from '@/lib/kamera';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

export function TimelapseListe({ liste, onEndret }: { liste: Timelapse[]; onEndret: () => void }) {
  const { supabase } = useAdmin();
  const [sletter, setSletter] = useState<number | null>(null);
  const [bekreft, setBekreft] = useState<number | null>(null);
  const [feil, setFeil] = useState('');

  async function oppdater(id: number, endring: Partial<Timelapse>) {
    if (!supabase) return;
    const { error } = await supabase.from('kamera_timelapser').update(endring).eq('id', id);
    if (error) setFeil('Klarte ikke å lagre endringen.');
    else onEndret();
  }

  async function slett(id: number) {
    if (!supabase) return;
    setSletter(id);
    setFeil('');
    const { data } = await supabase.auth.getSession();
    const res = await fetch('/api/kamera/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` },
      body: JSON.stringify({ handling: 'slett_timelapse', id }),
    });
    setSletter(null);
    setBekreft(null);
    if (!res.ok) setFeil('Klarte ikke å slette timelapsen.');
    onEndret();
  }

  if (!liste.length) {
    return (
      <p className="rounded-2xl bg-ink-50 px-4 py-4 text-sm text-ink-600">
        Ingen timelapser ennå. Når en print er ferdig, lager Pi-en en timelapse og legger den her. Du velger selv hvilke
        som skal vises på nettsiden.
      </p>
    );
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {liste.map((t) => (
          <div key={t.id} className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
            <video
              src={SUPABASE_URL ? kameraUrl(t.sti, SUPABASE_URL) : undefined}
              controls
              muted
              playsInline
              preload="metadata"
              className="aspect-video w-full bg-ink-900"
            />
            <div className="space-y-3 p-3">
              <input
                defaultValue={t.navn}
                maxLength={120}
                placeholder="Navn på printen"
                onBlur={(e) => e.target.value !== t.navn && oppdater(t.id, { navn: e.target.value })}
                className="field py-2"
                aria-label="Navn på timelapsen"
              />
              <div className="flex items-center justify-between gap-2 text-xs text-ink-500">
                <span>
                  {new Date(t.opprettet).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })} · {t.sekunder} s ·{' '}
                  {(t.storrelse / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => oppdater(t.id, { vis: !t.vis })}
                  className={`btn-sm ${t.vis ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {t.vis ? 'Vises på nettsiden ✓' : 'Vis på nettsiden'}
                </button>
                {bekreft === t.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => slett(t.id)}
                      disabled={sletter === t.id}
                      className="btn btn-sm border border-red-200 bg-white text-red-600 hover:bg-red-50"
                    >
                      {sletter === t.id ? 'Sletter …' : 'Ja, slett'}
                    </button>
                    <button type="button" onClick={() => setBekreft(null)} className="btn-ghost btn-sm">
                      Avbryt
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setBekreft(t.id)} className="btn-ghost btn-sm">
                    Slett
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {feil && <p className="mt-3 text-sm font-semibold text-red-600">{feil}</p>}
    </div>
  );
}
