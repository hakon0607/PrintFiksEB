/** Liten tegning av pepperkakeformen (handlekurv, bestillinger). */
import { svgSti, type Pkt } from '@/lib/pepperkake/sti';

export function PepperkakeMiniatyr({
  punkter,
  lukket,
  className,
}: {
  punkter: Pkt[];
  lukket: boolean;
  className?: string;
}) {
  if (!punkter?.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of punkter) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const side = Math.max(x1 - x0, y1 - y0, 10);
  const marg = side * 0.12;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const s = side / 2 + marg;
  return (
    <svg viewBox={`${cx - s} ${cy - s} ${s * 2} ${s * 2}`} className={className} aria-hidden>
      <path
        d={svgSti({ punkter, lukket })}
        fill={lukket ? '#e9b97a' : 'none'}
        fillOpacity={0.45}
        stroke="#0f172a"
        strokeWidth={side * 0.045}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
