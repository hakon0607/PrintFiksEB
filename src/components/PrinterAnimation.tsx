'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { Tilt } from '@/components/glass/Tilt';
import { CountUp } from '@/components/glass/CountUp';
import { kr } from '@/lib/settings';

const layers = Array.from({ length: 11 }, (_, i) => i);

export type PrinterAnimationProps = {
  /** Navnet på materialet vi viser fram, f.eks. PLA */
  materiale?: string;
  /** Kroner per gram for det materialet */
  perGram?: number;
  /** Startprisen fra innstillingene */
  startpris?: number;
  /** Vekten vi bruker i eksempelet */
  eksempelVekt?: number;
  dagerMin?: number;
  dagerMaks?: number;
  valuta?: string;
};

export function PrinterAnimation({
  materiale = 'PLA',
  perGram = 0.8,
  startpris = 100,
  eksempelVekt = 60,
  dagerMin = 2,
  dagerMaks = 4,
  valuta = 'kr',
}: PrinterAnimationProps) {
  const estimat = Math.round(startpris + eksempelVekt * perGram);
  const { scrollY } = useScroll();
  const parallax = useTransform(scrollY, [0, 800], [0, -90]);

  return (
    <motion.div style={{ y: parallax }} className="relative mx-auto w-full max-w-[420px]">
      <div
        aria-hidden
        className="glass-orb"
        style={{ width: 520, height: 520, left: '50%', top: '50%', margin: '-260px 0 0 -260px' }}
      />
      <Tilt max={14} lift={0}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="glass glass-slab relative overflow-hidden rounded-[2.25rem] p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">
              Printer nå
            </span>
          </div>
          <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold text-brand-700">
            {materiale} · {perGram.toLocaleString('nb-NO', { minimumFractionDigits: 2 })} {valuta}/g
          </span>
        </div>

        <svg viewBox="0 0 320 210" className="mt-4 w-full" role="img" aria-label="3D-printer i arbeid">
          {/* Ramme */}
          <rect x="18" y="14" width="284" height="172" rx="14" fill="white" fillOpacity="0.65" />
          <rect
            x="18"
            y="14"
            width="284"
            height="172"
            rx="14"
            fill="none"
            stroke="#C1D8FD"
            strokeWidth="2"
          />

          {/* Gantry */}
          <motion.g
            animate={{ x: [0, 54, -46, 20, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          >
            <rect x="34" y="34" width="252" height="6" rx="3" fill="#DCE9FE" />
            <rect x="140" y="30" width="40" height="26" rx="7" fill="#14171C" />
            <path d="M152 56h16l-5 12h-6z" fill="#272C37" />
            <motion.rect
              x="159"
              y="66"
              width="2"
              height="0"
              fill="#2559C7"
              animate={{ height: [0, 20, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.g>

          {/* Printet objekt – lag som bygges opp */}
          <g>
            {layers.map((i) => {
              const w = 96 - Math.abs(i - 5) * 7;
              return (
                <motion.rect
                  key={i}
                  x={160 - w / 2}
                  y={158 - i * 8}
                  width={w}
                  height={7}
                  rx={2}
                  fill={i % 2 === 0 ? '#2559C7' : '#3D76F1'}
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: [0, 1, 1, 0], scaleY: [0, 1, 1, 0] }}
                  style={{ originY: 1 }}
                  transition={{
                    duration: 7,
                    repeat: Infinity,
                    ease: 'easeOut',
                    times: [0, 0.06 + i * 0.05, 0.92, 1],
                  }}
                />
              );
            })}
          </g>

          {/* Printbed */}
          <rect x="44" y="166" width="232" height="9" rx="4" fill="#14171C" />
          <rect x="60" y="175" width="200" height="5" rx="2.5" fill="#3D4453" />
        </svg>

        <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-ink-500">
          <span>Lag 11 av 11</span>
          <span>
            Ferdig om ca. {dagerMin}–{dagerMaks} dager
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/80">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
            animate={{ width: ['4%', '100%'] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>
      </Tilt>

      {/* Flytende priskort */}
      <motion.div
        initial={{ opacity: 0, y: 16, x: -10 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ delay: 0.5, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="glass glass-lens absolute -bottom-7 -left-3 w-[188px] rounded-[22px] p-4 sm:-left-8"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">Estimat</p>
        <p className="mt-1 text-2xl font-bold text-ink-900">
          <CountUp to={estimat} delay={700} />{' '}
          <span className="text-base font-semibold text-ink-500">{valuta}</span>
        </p>
        <p className="mt-1 text-[11px] leading-snug text-ink-500">
          Startpris {kr(startpris, valuta)} + {eksempelVekt} g {materiale}. Du godkjenner før vi
          starter.
        </p>
      </motion.div>
    </motion.div>
  );
}
