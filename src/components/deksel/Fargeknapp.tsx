import type { Filament } from '@/lib/deksel/farger';

export function Fargeknapp({
  f, valgt, onClick, liten, deaktivert,
}: { f: Filament; valgt: boolean; onClick: () => void; liten?: boolean; deaktivert?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={deaktivert}
      title={deaktivert ? `${f.navn} – fjern en annen farge først` : f.navn} aria-label={f.navn} aria-pressed={valgt}
      className={`grid place-items-center rounded-full border transition-all disabled:cursor-not-allowed disabled:opacity-25 ${liten ? 'h-9 w-9' : 'h-11 w-11'} ${valgt ? 'border-cyan-400 ring-4 ring-cyan-400/25 shadow-[0_0_16px_-2px_rgba(34,211,238,.7)]' : 'border-ink-200/60 hover:border-cyan-300'}`}>
      <span className={`${liten ? 'h-6 w-6' : 'h-8 w-8'} rounded-full border border-black/10`} style={{ background: f.hex }} />
    </button>
  );
}
