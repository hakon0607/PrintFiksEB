'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '@/lib/cart';
import { formatPhone, telHref } from '@/lib/settings';

const links = [
  { href: '/', label: 'Hjem' },
  { href: '/bestill', label: 'Bestill' },
  { href: '/galleri', label: 'Galleri' },
  { href: '/3d-printing', label: 'Hva vi kan fikse' },
  { href: '/om-oss', label: 'Om oss' },
];

export function Nav({ businessName, phone }: { businessName: string; phone: string }) {
  const pathname = usePathname();
  const { count, ready } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-ink-100/80 bg-white/80 backdrop-blur-xl shadow-[0_1px_20px_-10px_rgba(20,23,28,0.35)]'
          : 'border-b border-transparent bg-white/40 backdrop-blur-md'
      }`}
    >
      <nav className="container-x flex h-[68px] items-center justify-between gap-4">
        <Link href="/" className="group flex items-center gap-2.5" aria-label={businessName}>
          <motion.span
            whileHover={{ rotate: -6, scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 320, damping: 16 }}
            className="relative block h-9 w-9 overflow-hidden rounded-xl"
          >
            <Image src="/logo-mark.png" alt="" fill sizes="36px" className="object-contain" priority />
          </motion.span>
          <span className="relative hidden h-[22px] w-[116px] sm:block">
            <Image
              src="/logo-text.png"
              alt={businessName}
              fill
              sizes="116px"
              className="object-contain object-left"
              priority
            />
          </span>
          <span className="text-base font-bold tracking-tight sm:hidden">{businessName}</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active ? 'text-brand-700' : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-brand-50 ring-1 ring-brand-200/70"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative">{link.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={telHref(phone)}
            className="btn-ghost btn-sm hidden lg:inline-flex"
            aria-label={`Ring oss på ${formatPhone(phone)}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6.5 3.5h3l1.5 4-2 1.4a12 12 0 0 0 6.1 6.1l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
            {formatPhone(phone)}
          </a>

          <a
            href={telHref(phone)}
            className="btn-ghost btn-sm lg:hidden"
            aria-label={`Ring oss på ${formatPhone(phone)}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6.5 3.5h3l1.5 4-2 1.4a12 12 0 0 0 6.1 6.1l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
          </a>

          <Link href="/bestill" className="btn-primary btn-sm relative">
            <span>Bestill</span>
            <AnimatePresence>
              {ready && count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  className="ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-bold text-brand-700"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="btn-ghost btn-sm md:hidden"
            aria-label="Meny"
            aria-expanded={open}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d={open ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-ink-100 bg-white/95 backdrop-blur-xl md:hidden"
          >
            <div className="container-x flex flex-col gap-1 py-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                    pathname === link.href
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-ink-700 hover:bg-ink-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <a
                href={telHref(phone)}
                className="rounded-2xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700"
              >
                Ring oss på {formatPhone(phone)}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
