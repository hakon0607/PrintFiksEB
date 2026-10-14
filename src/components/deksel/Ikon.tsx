/** Små strek-ikoner til dekseleditoren (egne, ingen ikonpakke). */
const STIER: Record<string, string> = {
  flytt: 'M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3',
  blyant: 'M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20zM14 7.5l2.5 2.5',
  visk: 'M7.5 20h12M4.6 15.4l8.8-8.8a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L11 19.1a3 3 0 0 1-4.2 0l-2.2-2.2a1 1 0 0 1 0-1.5zM9 11l5 5',
  angre: 'M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-2',
  gjenta: 'M15 7l5 5-5 5M20 12H9a5 5 0 0 0 0 10h2',
  bilde: 'M4 5h16v14H4zM4 16l4.5-4.5 3.5 3.5 2.5-2.5L20 18M15.5 9.5a1.5 1.5 0 1 0 0-.01',
  tekst: 'M5 6V4.5h14V6M12 4.5V20M9 20h6',
  stjerne: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z',
  soppel: 'M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13M10.5 11v5.5M13.5 11v5.5',
  kopi: 'M8 8h11v11H8zM5 16V5h11',
  frem: 'M12 19V5M6 11l6-6 6 6',
  bak: 'M12 5v14M6 13l6 6 6-6',
  lukk: 'M6 6l12 12M18 6L6 18',
  fyll: 'M4 4h16v16H4zM8 8h8v8H8z',
  tilpass: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
};

export function Ikon({ navn, stor }: { navn: string; stor?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={stor ? 'h-5 w-5' : 'h-4 w-4'} fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={STIER[navn] ?? ''} />
    </svg>
  );
}
