import type { Analyse } from '@/lib/deksel/analyse';
import { rammer, sti } from '@/lib/deksel/svg';

/** Liten tegning av baksiden med kamerahull og (valgfritt) den trygge sonen fylt inn. */
export function DekselMiniatyr({ a, visTrygg, className }: { a: Analyse; visTrygg?: boolean; className?: string }) {
  const r = rammer(a.silhuett);
  return (
    <svg viewBox={`${r.u0 - 2} ${-r.v0 - 2} ${r.bredde + 4} ${r.hoyde + 4}`} className={className} aria-hidden>
      <path d={sti([a.silhuett, ...a.hull])} fill="#ffffff" fillRule="evenodd" stroke="#8891A2" strokeWidth="0.6" />
      <path d={sti(a.trygg.flat())} fill={visTrygg ? 'rgba(37,89,199,.08)' : 'none'} fillRule="evenodd" stroke="#2559C7" strokeWidth="0.5" strokeDasharray="1.6 1.2" />
    </svg>
  );
}
