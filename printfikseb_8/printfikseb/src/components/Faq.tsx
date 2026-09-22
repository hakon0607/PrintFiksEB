'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Faq as FaqType } from '@/lib/types';

export function FaqList({ items }: { items: FaqType[] }) {
  const [apen, setApen] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className="divide-y divide-ink-100 overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-soft">
      {items.map((item) => {
        const open = apen === item.id;
        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => setApen(open ? null : item.id)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-brand-50/40"
              aria-expanded={open}
            >
              <span className="text-[15px] font-semibold text-ink-900">{item.question}</span>
              <motion.span
                animate={{ rotate: open ? 45 : 0 }}
                transition={{ duration: 0.2 }}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  open ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-500'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-6 text-sm leading-relaxed text-ink-600">{item.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
