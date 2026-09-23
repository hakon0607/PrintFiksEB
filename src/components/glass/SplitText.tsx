'use client';

import { motion } from 'framer-motion';

/** Overskrift der ordene glir opp ett og ett når de kommer til syne. */
export function SplitText({
  text,
  highlight,
  delay = 0,
  className,
  as = 'h2',
}: {
  text: string;
  /** Ord på slutten som får blå glans, f.eks. "i 3D" */
  highlight?: string;
  delay?: number;
  className?: string;
  as?: 'h1' | 'h2' | 'h3';
}) {
  const Comp = motion[as];
  let main = text;
  let hl = '';
  if (highlight && text.endsWith(highlight)) {
    main = text.slice(0, -highlight.length).trimEnd();
    hl = highlight;
  }
  const words = main.split(/\s+/).filter(Boolean);
  const hlWords = hl ? hl.split(/\s+/) : [];
  const all = [...words.map((w) => ({ w, hl: false })), ...hlWords.map((w) => ({ w, hl: true }))];

  return (
    <Comp
      className={className}
      aria-label={text}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
      variants={{ show: { transition: { staggerChildren: 0.055, delayChildren: delay } } }}
    >
      {all.map((item, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.1em] -mb-[0.1em] align-bottom">
          <motion.span
            className={`inline-block ${item.hl ? 'text-shine' : ''}`}
            variants={{
              hidden: { y: '105%' },
              show: { y: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } },
            }}
          >
            {item.w}
          </motion.span>
          {i < all.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Comp>
  );
}
