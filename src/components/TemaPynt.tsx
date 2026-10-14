/**
 * Pynt til sesongtemaene: bannere, snøfall og små ikoner.
 * Alt er tegnet her som SVG – ingen bilder å laste ned, skarpt på alle skjermer.
 */
import type { TemaId } from '@/lib/temaer';

/* ------------------------------------------------------------------ */
/*  Små ikoner (nedtrekksmeny og merker på kortene)                    */
/* ------------------------------------------------------------------ */

export function TemaIkon({ tema, className = 'h-4 w-4' }: { tema: TemaId; className?: string }) {
  if (tema === 'halloween') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path d="M12 6.2c.2-1.6 1-2.8 2.4-3.4" stroke="#4d7c0f" strokeWidth="2" strokeLinecap="round" fill="none" />
        <ellipse cx="7.6" cy="14" rx="5" ry="6.6" fill="#ea580c" />
        <ellipse cx="16.4" cy="14" rx="5" ry="6.6" fill="#ea580c" />
        <ellipse cx="12" cy="14" rx="5.2" ry="7.2" fill="#f97316" />
        <path d="M8.2 12.4 10 10.2l1.2 2.2zM15.8 12.4 14 10.2l-1.2 2.2z" fill="#fde047" />
        <path d="M7.8 15.6c1.3 1.6 7.1 1.6 8.4 0l-1.4.4-.7-.9-.8 1-.9-1-.8 1-.8-1-.7.9z" fill="#fde047" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 2.5 13 4.6l2.3.3-1.7 1.6.4 2.3L12 7.7l-2 1.1.4-2.3-1.7-1.6L11 4.6z" fill="#fbbf24" />
      <path d="M12 7.5 6.5 14h3L5.5 19h13l-4-5h3z" fill="#16a34a" />
      <rect x="10.8" y="19" width="2.4" height="3" rx=".6" fill="#78350f" />
      <circle cx="10" cy="15.6" r="1" fill="#ef4444" />
      <circle cx="14.2" cy="13.2" r=".9" fill="#fbbf24" />
      <circle cx="13.6" cy="17.4" r="1" fill="#ef4444" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Halloween                                                          */
/* ------------------------------------------------------------------ */

function Gresskar({ x, y, s = 1, lys = true }: { x: number; y: number; s?: number; lys?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {lys && <ellipse cx="0" cy="-26" rx="58" ry="46" fill="url(#hw-gressglod)" />}
      <path d="M2 -52c2-10 8-16 16-18" stroke="#3f6212" strokeWidth="6" strokeLinecap="round" fill="none" />
      <ellipse cx="-22" cy="-24" rx="26" ry="30" fill="#c2410c" />
      <ellipse cx="22" cy="-24" rx="26" ry="30" fill="#c2410c" />
      <ellipse cx="-10" cy="-25" rx="22" ry="31" fill="#ea580c" />
      <ellipse cx="10" cy="-25" rx="22" ry="31" fill="#ea580c" />
      <ellipse cx="0" cy="-25" rx="17" ry="32" fill="#f97316" />
      {/* ansiktet */}
      <path d="M-21 -32 -11 -46 -3 -32z M21 -32 11 -46 3 -32z" fill="#fde047" />
      <path d="M-6 -24 0 -32 6 -24z" fill="#fde047" />
      <path
        d="M-26 -16c10 14 42 14 52 0l-7 3-4-6-5 7-5-7-5 7-5-7-5 7-5-7-4 6z"
        fill="#fde047"
      />
    </g>
  );
}

function Flaggermus({ x, y, s = 1, forsinkelse = 0 }: { x: number; y: number; s?: number; forsinkelse?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="tema-svev" style={{ animationDelay: `${forsinkelse}s` }}>
        <g className="tema-flagre" style={{ animationDelay: `${forsinkelse}s` }}>
          <path
            d="M0 2c-3-6-10-9-18-8 3 2 4 5 3 8-4-2-8-2-11 1 5 0 8 3 9 7 3-3 7-4 11-3 2-1 4-2 6-5 2 3 4 4 6 5 4-1 8 0 11 3 1-4 4-7 9-7-3-3-7-3-11-1-1-3 0-6 3-8-8-1-15 2-18 8z"
            fill="#0b0614"
          />
          <path d="M-2.5 -3 -1.2 -7 0 -3.6 1.2 -7 2.5 -3z" fill="#0b0614" />
        </g>
      </g>
    </g>
  );
}

function Spokelse({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="tema-svev" style={{ animationDuration: '5.5s' }}>
        <path
          d="M-18 20V-4a18 18 0 0 1 36 0v24l-6-5-6 5-6-5-6 5-6-5z"
          fill="#f5f3ff"
          opacity="0.92"
        />
        <ellipse cx="-6" cy="-3" rx="2.6" ry="3.6" fill="#1c0f30" />
        <ellipse cx="6" cy="-3" rx="2.6" ry="3.6" fill="#1c0f30" />
        <ellipse cx="0" cy="6" rx="3" ry="4" fill="#1c0f30" />
      </g>
    </g>
  );
}

const STJERNER: [number, number, number][] = [
  [330, 30, 1.6], [380, 70, 1.1], [430, 22, 1.3], [470, 96, 1], [520, 40, 1.8],
  [560, 120, 1.1], [720, 26, 1.3], [760, 110, 1.6], [610, 18, 1], [290, 92, 1.2],
];

export function HalloweenScene() {
  return (
    <svg
      viewBox="0 0 800 240"
      preserveAspectRatio="xMaxYMax slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <radialGradient id="hw-maaneglod">
          <stop offset="0" stopColor="#fde68a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hw-gressglod">
          <stop offset="0" stopColor="#fb923c" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fb923c" stopOpacity="0" />
        </radialGradient>
      </defs>

      {STJERNER.map(([x, y, r], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={r}
          fill="#ede9fe"
          className="tema-blink"
          style={{ animationDelay: `${(i * 0.37) % 2.4}s` }}
        />
      ))}

      {/* månen */}
      <circle cx="665" cy="74" r="92" fill="url(#hw-maaneglod)" />
      <circle cx="665" cy="74" r="44" fill="#fde68a" />
      <circle cx="650" cy="62" r="7" fill="#fcd34d" opacity="0.7" />
      <circle cx="680" cy="88" r="10" fill="#fcd34d" opacity="0.6" />
      <circle cx="676" cy="56" r="4" fill="#fcd34d" opacity="0.7" />

      <Flaggermus x={600} y={60} s={1.15} />
      <Flaggermus x={705} y={36} s={0.8} forsinkelse={0.6} />
      <Flaggermus x={520} y={84} s={0.7} forsinkelse={1.1} />
      <Flaggermus x={760} y={132} s={0.6} forsinkelse={0.3} />

      <Spokelse x={462} y={140} s={0.9} />

      {/* åser */}
      <path d="M0 240V196c90-30 170-28 250-8s170 10 260-18 190-26 290 0v70z" fill="#120a1f" />
      <path d="M380 240v-26c70-20 150-22 220-6s120 6 200-8v40z" fill="#0b0614" />

      {/* gjerde */}
      <g fill="#0b0614">
        {[388, 410, 432, 454, 476].map((x) => (
          <path key={x} d={`M${x} 214v-30l5-7 5 7v30z`} />
        ))}
        <rect x="384" y="192" width="100" height="4" />
      </g>

      <Gresskar x={572} y={232} s={1.25} />
      <Gresskar x={704} y={236} s={0.95} />
      <Gresskar x={772} y={238} s={0.6} lys={false} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Jul                                                                */
/* ------------------------------------------------------------------ */

function Juletre({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-7" y="-14" width="14" height="16" rx="2" fill="#78350f" />
      <path d="M0 -122 -46 -48h18L-56 -14h112L28 -48h18z" fill="#15803d" />
      <path d="M0 -122 -32 -72h12L-40 -44h80L20 -72h12z" fill="#16a34a" />
      {/* snø på kantene */}
      <path d="M-56 -14h112l-6 -5c-8 4-16 4-24 0-8 4-18 4-26 0-8 4-18 4-26 0-8 4-16 4-24 0z" fill="#f8fafc" opacity="0.9" />
      <path d="M-46 -48h18l-3 -4c-5 3-10 3-15 0zM28 -48h18l-3-4c-5 3-10 3-15 0z" fill="#f8fafc" opacity="0.85" />
      {/* kuler */}
      <circle cx="-20" cy="-30" r="5" fill="#ef4444" />
      <circle cx="18" cy="-26" r="5" fill="#fbbf24" />
      <circle cx="-4" cy="-60" r="4.5" fill="#fbbf24" />
      <circle cx="12" cy="-80" r="4" fill="#ef4444" />
      <circle cx="-12" cy="-90" r="3.5" fill="#60a5fa" />
      <circle cx="30" cy="-52" r="4" fill="#ef4444" />
      <circle cx="-30" cy="-58" r="4" fill="#60a5fa" />
      {/* stjerna */}
      <g className="tema-blink" style={{ animationDuration: '2.8s' }}>
        <circle cx="0" cy="-128" r="16" fill="#fbbf24" opacity="0.25" />
        <path d="m0 -140 3.6 7.4 8.2 1.2-5.9 5.7 1.4 8.1L0 -121.4l-7.3 3.9 1.4-8.1-5.9-5.7 8.2-1.2z" fill="#fcd34d" />
      </g>
    </g>
  );
}

function Gave({ x, y, b, h, farge, baand }: { x: number; y: number; b: number; h: number; farge: string; baand: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-b / 2} y={-h} width={b} height={h} rx="3" fill={farge} />
      <rect x={-b / 2 - 3} y={-h - 8} width={b + 6} height="10" rx="2.5" fill={farge} />
      <rect x="-3.5" y={-h - 8} width="7" height={h + 8} fill={baand} />
      <path d={`M0 ${-h - 8}c-6-10-18-12-18-4s12 6 18 4c6 2 18 4 18-4s-12-6-18 4z`} fill={baand} />
    </g>
  );
}

const LYS = ['#ef4444', '#fbbf24', '#22c55e', '#60a5fa', '#f472b6'];

export function JulScene() {
  // lyslenke langs toppen
  const punkter = Array.from({ length: 13 }, (_, i) => {
    const t = i / 12;
    const x = 280 + t * 520;
    const y = 18 + Math.sin(t * Math.PI * 3) * 10 + t * 8;
    return [x, y] as const;
  });
  const linje = punkter.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

  return (
    <svg
      viewBox="0 0 800 240"
      preserveAspectRatio="xMaxYMax slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <radialGradient id="jul-glod">
          <stop offset="0" stopColor="#fde68a" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="640" cy="120" r="150" fill="url(#jul-glod)" />

      <path d={linje} stroke="#052e1f" strokeWidth="2" fill="none" />
      {punkter.map(([x, y], i) => (
        <g key={i}>
          <circle
            cx={x}
            cy={y + 7}
            r="9"
            fill={LYS[i % LYS.length]}
            opacity="0.25"
            className="tema-blink"
            style={{ animationDelay: `${(i % 4) * 0.5}s`, animationDuration: '2s' }}
          />
          <ellipse
            cx={x}
            cy={y + 7}
            rx="3.6"
            ry="5"
            fill={LYS[i % LYS.length]}
            className="tema-blink"
            style={{ animationDelay: `${(i % 4) * 0.5}s`, animationDuration: '2s' }}
          />
        </g>
      ))}

      {/* snødekt bakke */}
      <path d="M0 240v-34c110-22 220-24 330-6s200 14 300-8 120-14 170-4v52z" fill="#e2e8f0" opacity="0.18" />
      <path d="M300 240v-26c90-18 180-20 260-6s150 8 240-6v38z" fill="#f8fafc" />

      <Juletre x={612} y={228} s={1.35} />
      <Juletre x={712} y={230} s={0.95} />
      <Juletre x={772} y={232} s={0.62} />

      <Gave x={500} y={232} b={40} h={30} farge="#dc2626" baand="#fbbf24" />
      <Gave x={540} y={234} b={28} h={22} farge="#fbbf24" baand="#dc2626" />
      <Gave x={664} y={236} b={24} h={18} farge="#2563eb" baand="#f8fafc" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Snøfall over hele jule-seksjonen                                   */
/* ------------------------------------------------------------------ */

/** Faste «tilfeldige» tall, så server og nettleser tegner det samme. */
function frø(i: number) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function Snofall({ antall = 34 }: { antall?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: antall }, (_, i) => {
        const str = 2 + frø(i) * 4;
        return (
          <span
            key={i}
            className="tema-sno absolute block rounded-full bg-white"
            style={{
              left: `${frø(i + 100) * 100}%`,
              width: str,
              height: str,
              opacity: 0.35 + frø(i + 200) * 0.5,
              animationDuration: `${9 + frø(i + 300) * 10}s`,
              animationDelay: `${-frø(i + 400) * 18}s`,
            }}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Edderkoppnett i hjørnet av halloween-seksjonen                     */
/* ------------------------------------------------------------------ */

export function Nett({ className = '' }: { className?: string }) {
  const r = [26, 52, 80, 110];
  const vinkler = [0, 18, 36, 54, 72, 90];
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <g stroke="#ede9fe" strokeOpacity="0.22" strokeWidth="1" fill="none">
        {vinkler.map((v) => {
          const a = (v * Math.PI) / 180;
          return <line key={v} x1="0" y1="0" x2={120 * Math.cos(a)} y2={120 * Math.sin(a)} />;
        })}
        {r.map((rr) => (
          <path
            key={rr}
            d={vinkler
              .map((v, i) => {
                const a = (v * Math.PI) / 180;
                return `${i === 0 ? 'M' : 'Q'}${
                  i === 0 ? '' : `${(rr * 0.82 * Math.cos(a - 0.157)).toFixed(1)} ${(rr * 0.82 * Math.sin(a - 0.157)).toFixed(1)} `
                }${(rr * Math.cos(a)).toFixed(1)} ${(rr * Math.sin(a)).toFixed(1)}`;
              })
              .join(' ')}
          />
        ))}
      </g>
      <line x1="62" y1="0" x2="62" y2="58" stroke="#ede9fe" strokeOpacity="0.35" />
      <circle cx="62" cy="62" r="5" fill="#0b0614" />
      <circle cx="62" cy="55" r="3.2" fill="#0b0614" />
    </svg>
  );
}
