'use client';

import { motion, type Variants } from 'framer-motion';
import React from 'react';

const variants: Variants = {
  hidden: { opacity: 0, y: 22, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Reveal({
  children,
  delay = 0,
  className,
  as = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article' | 'header';
}) {
  const Comp = motion[as] as typeof motion.div;
  return (
    <Comp
      data-reveal
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay }}
    >
      {children}
    </Comp>
  );
}

export function Stagger({
  children,
  className,
  gap = 0.07,
}: {
  children: React.ReactNode;
  className?: string;
  gap?: number;
}) {
  return (
    <motion.div
      data-reveal
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      variants={{ show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div data-reveal className={className} variants={variants}>
      {children}
    </motion.div>
  );
}
