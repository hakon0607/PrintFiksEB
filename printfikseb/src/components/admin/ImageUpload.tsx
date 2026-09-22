'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { useAdmin } from './AdminProvider';

export function ImageUpload({
  value,
  onChange,
  label = 'Bilde',
  help = 'Velg et bilde fra mobilen eller PC-en. Kvadratiske bilder ser best ut.',
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  help?: string;
}) {
  const { supabase } = useAdmin();
  const inputRef = useRef<HTMLInputElement>(null);
  const [laster, setLaster] = useState(false);
  const [feil, setFeil] = useState('');

  async function velg(e: React.ChangeEvent<HTMLInputElement>) {
    const fil = e.target.files?.[0];
    if (!fil || !supabase) return;

    if (fil.size > 8 * 1024 * 1024) {
      setFeil('Bildet er for stort. Velg et bilde under 8 MB.');
      return;
    }

    setLaster(true);
    setFeil('');

    const endelse = (fil.name.split('.').pop() || 'jpg').toLowerCase();
    const navn = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${endelse}`;

    const { error } = await supabase.storage.from('bilder').upload(navn, fil, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      setFeil('Klarte ikke å laste opp bildet. Prøv et annet bilde.');
      setLaster(false);
      return;
    }

    const { data } = supabase.storage.from('bilder').getPublicUrl(navn);
    onChange(data.publicUrl);
    setLaster(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-start gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-ink-200 bg-ink-50">
          {value ? (
            <Image src={value} alt="" fill sizes="96px" className="object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-xs text-ink-400">
              Ingen bilde
            </span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={laster}
              className="btn-soft btn-sm"
            >
              {laster ? 'Laster opp…' : value ? 'Bytt bilde' : 'Last opp bilde'}
            </button>
            {value && (
              <button type="button" onClick={() => onChange('')} className="btn-ghost btn-sm">
                Fjern
              </button>
            )}
          </div>
          <p className="hint">{help}</p>
          {feil && <p className="mt-1.5 text-xs font-semibold text-red-600">{feil}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={velg}
        className="hidden"
        aria-hidden
      />
    </div>
  );
}
