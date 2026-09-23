'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/** Fremdriftslinje mens AI-en jobber. Kryper opp mot 92 %, og fyller seg når svaret kommer. */
export function Fremdrift({
  aktiv,
  ferdig,
  tekst = 'AI-en jobber…',
  ventetid = 14000,
}: {
  aktiv: boolean;
  ferdig?: boolean;
  tekst?: string;
  ventetid?: number;
}) {
  const [prosent, setProsent] = useState(0);

  useEffect(() => {
    if (ferdig) {
      setProsent(100);
      return;
    }
    if (!aktiv) {
      setProsent(0);
      return;
    }

    const start = Date.now();
    const id = window.setInterval(() => {
      const gaatt = Date.now() - start;
      // Nærmer seg 92 % og stopper der til svaret kommer
      const p = 92 * (1 - Math.exp(-gaatt / (ventetid / 2.5)));
      setProsent(Math.min(92, p));
    }, 120);

    return () => window.clearInterval(id);
  }, [aktiv, ferdig, ventetid]);

  if (!aktiv && !ferdig) return null;

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-brand-800">{tekst}</span>
        <span className="text-xs font-bold tabular-nums text-brand-700">
          {Math.round(prosent)} %
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
          animate={{ width: `${prosent}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
