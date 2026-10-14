/** «Design din egen!» – merke på produkter kunden kan designe selv. */
export function DesignMerke({ liten, className = '' }: { liten?: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-400 font-bold text-white shadow-[0_6px_18px_-6px_rgba(236,72,153,.7)] ring-1 ring-white/40 ${
        liten ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
      } ${className}`}
    >
      <svg width={liten ? 10 : 12} height={liten ? 10 : 12} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      </svg>
      Design din egen!
    </span>
  );
}
