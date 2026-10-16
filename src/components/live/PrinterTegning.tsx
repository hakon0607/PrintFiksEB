/**
 * Tegnet 3D-printer som printer en liten figur lag for lag.
 * Brukes når kameraet ikke er på (kommer snart / frakoblet).
 */
export function PrinterTegning({ aktiv = true, className = '' }: { aktiv?: boolean; className?: string }) {
  const lag = Array.from({ length: 12 }, (_, i) => i);
  // hvert lag dukker opp etter tur, og alle forsvinner samtidig før det starter på nytt
  const lagAnimasjon = lag
    .map((i) => {
      const start = 4 + i * 7;
      return `@keyframes pt-lag-${i} { 0%, ${start}% { opacity: 0; } ${start + 1}%, 92% { opacity: 1; } 97%, 100% { opacity: 0; } }
        .pt-lag-${i} { animation: pt-lag-${i} 9.6s linear infinite; }`;
    })
    .join('\n');
  return (
    <svg viewBox="0 0 640 360" className={className} role="img" aria-label="Tegning av en 3D-printer som printer lag for lag">
      <style>{`
        .pt-vogn { animation: pt-vogn 1.6s ease-in-out infinite alternate; }
        .pt-glod { animation: pt-glod 1.2s ease-in-out infinite alternate; }
        @keyframes pt-vogn { from { transform: translateX(-62px); } to { transform: translateX(62px); } }
        ${lagAnimasjon}
        @keyframes pt-glod { from { opacity: .35; } to { opacity: .9; } }
        @media (prefers-reduced-motion: reduce) {
          .pt-vogn, .pt-glod, [class^='pt-lag-'] { animation: none !important; opacity: 1; }
        }
      `}</style>
      <defs>
        <linearGradient id="pt-bak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1B2233" />
          <stop offset="1" stopColor="#0C0E12" />
        </linearGradient>
        <linearGradient id="pt-plast" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3D76F1" />
          <stop offset="1" stopColor="#2559C7" />
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#pt-bak)" />
      {/* ramme */}
      <rect x="150" y="34" width="340" height="300" rx="18" fill="none" stroke="#3D4453" strokeWidth="10" />
      <rect x="168" y="52" width="304" height="264" rx="10" fill="#141924" />
      {/* plata */}
      <rect x="200" y="282" width="240" height="14" rx="5" fill="#525A6B" />
      {/* figuren som vokser */}
      {lag.map((i) => {
        const b = 120 - Math.round(Math.sin((i / 11) * Math.PI) * 26) - i * 2;
        return (
          <rect
            key={i}
            className={aktiv ? `pt-lag-${i}` : undefined}
            x={320 - b / 2}
            y={268 - i * 12}
            width={b}
            height={11}
            rx={4}
            fill="url(#pt-plast)"
          />
        );
      })}
      {/* bjelke og skrivehode */}
      <rect x="168" y="88" width="304" height="10" rx="5" fill="#3D4453" />
      <g className={aktiv ? 'pt-vogn' : undefined}>
        <rect x="292" y="74" width="56" height="44" rx="9" fill="#D6DAE2" />
        <circle cx="320" cy="96" r="11" fill="none" stroke="#8891A2" strokeWidth="3" />
        <path d="M312 118h16l-5 14h-6z" fill="#E7B04A" />
        <circle className={aktiv ? 'pt-glod' : undefined} cx="320" cy="136" r="5" fill="#FF8A3D" />
      </g>
      {/* trådrull */}
      <circle cx="560" cy="110" r="44" fill="#2559C7" stroke="#3D4453" strokeWidth="6" />
      <circle cx="560" cy="110" r="14" fill="#D6DAE2" />
      <path d="M516 112 C 470 120, 380 70, 340 76" fill="none" stroke="#3D76F1" strokeWidth="4" />
    </svg>
  );
}
