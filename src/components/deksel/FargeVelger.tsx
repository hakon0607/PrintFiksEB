'use client';

/**
 * Fri fargevelger mens man redigerer: filamentfargene våre, noen ekstra farger
 * og «egen farge». Ved forhåndsvisningen gjøres alt om til fargene vi har.
 * En farge er enten en filament-id («svart») eller en hex-kode («#ff66aa»).
 */
import type { Filament } from '@/lib/deksel/farger';
import { Fargeknapp } from './Fargeknapp';

export const EKSTRA_FARGER: Filament[] = [
  { id: '#F472B6', navn: 'Rosa', hex: '#F472B6' },
  { id: '#FB923C', navn: 'Oransje', hex: '#FB923C' },
  { id: '#A855F7', navn: 'Lilla', hex: '#A855F7' },
  { id: '#22D3EE', navn: 'Turkis', hex: '#22D3EE' },
  { id: '#60A5FA', navn: 'Lyseblå', hex: '#60A5FA' },
  { id: '#A3E635', navn: 'Lime', hex: '#A3E635' },
  { id: '#92400E', navn: 'Brun', hex: '#92400E' },
];

export function FargeVelger({
  valgt,
  filamenter,
  dekselId,
  onVelg,
}: {
  valgt: string;
  filamenter: Filament[];
  dekselId: string;
  onVelg: (farge: string) => void;
}) {
  const liste = [
    ...filamenter.filter((f) => f.id !== dekselId),
    ...EKSTRA_FARGER.filter((e) => !filamenter.some((f) => f.hex.toLowerCase() === e.hex.toLowerCase())),
  ];
  const egen = valgt.startsWith('#') && !liste.some((f) => f.id.toLowerCase() === valgt.toLowerCase());
  return (
    <div className="flex flex-wrap gap-1.5">
      {liste.map((f) => (
        <Fargeknapp key={f.id} f={f} liten valgt={valgt.toLowerCase() === f.id.toLowerCase()} onClick={() => onVelg(f.id)} />
      ))}
      <label
        title="Egen farge"
        className={`relative grid h-9 w-9 cursor-pointer place-items-center rounded-full border transition-all ${egen ? 'border-cyan-400 ring-4 ring-cyan-400/25' : 'border-ink-200/60 hover:border-cyan-300'}`}
      >
        <span
          className="h-6 w-6 rounded-full border border-black/10"
          style={{ background: egen ? valgt : 'conic-gradient(#ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ec4899, #ef4444)' }}
        />
        <input
          type="color"
          aria-label="Egen farge"
          value={egen ? valgt : '#ff66aa'}
          onChange={(e) => onVelg(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
