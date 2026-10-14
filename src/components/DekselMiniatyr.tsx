/**
 * Lite bilde av et ferdig designet deksel: omrisset i dekselfargen med
 * motivet oppå. Brukes i handlekurven og i admin.
 */
export function DekselMiniatyr({
  silhuett,
  dekselfarge,
  design,
  ramme,
  className = 'h-16 w-auto',
}: {
  /** SVG-sti for omriss + hull (fra lib/deksel/svg) */
  silhuett: string;
  dekselfarge: string;
  design: string;
  ramme: { u0: number; v0: number; skala: number; bredde: number; hoyde: number };
  className?: string;
}) {
  const b = ramme.bredde * ramme.skala;
  const h = ramme.hoyde * ramme.skala;
  const id = `dm-${Math.abs(hash(silhuett + design.length)).toString(36)}`;
  return (
    <svg
      viewBox={`${ramme.u0 - 1} ${-ramme.v0 - 1} ${b + 2} ${h + 2}`}
      className={className}
      aria-hidden
    >
      <defs>
        <clipPath id={id}>
          <path d={silhuett} fillRule="evenodd" clipRule="evenodd" />
        </clipPath>
      </defs>
      <path d={silhuett} fillRule="evenodd" fill={dekselfarge} stroke="rgba(0,0,0,.18)" strokeWidth="0.6" />
      <image
        href={design}
        x={ramme.u0}
        y={-ramme.v0}
        width={b}
        height={h}
        preserveAspectRatio="none"
        clipPath={`url(#${id})`}
      />
    </svg>
  );
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i += 7) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
