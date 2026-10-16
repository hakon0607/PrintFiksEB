'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '@/lib/cart';
import { formatPhone, telHref } from '@/lib/settings';

type Lenke = { href: string; label: string; live?: boolean };

const alleLenker: Lenke[] = [
  { href: '/', label: 'Hjem' },
  { href: '/bestill', label: 'Bestill' },
  { href: '/galleri', label: 'Galleri' },
  { href: '/3d-printing', label: 'Hva vi kan fikse' },
  { href: '/om-oss', label: 'Om oss' },
];

/** Live kamera-fanen (styres i admin → Live kamera). */
export type KameraFane = { label: string; live: boolean } | null;

/** Rød, pulserende prikk når kameraet sender live. */
function LivePrikk() {
  return (
    <span className="relative ml-1.5 inline-flex h-2 w-2 align-middle" aria-label="sender live nå">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
    </span>
  );
}

export function Nav({
  businessName,
  phone,
  kamera = null,
}: {
  businessName: string;
  phone: string;
  kamera?: KameraFane;
}) {
  const pathname = usePathname();
  const { count, ready } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const links: Lenke[] = [...alleLenker];
  if (kamera) {
    // legges rett før «Om oss»
    const i = links.findIndex((l) => l.href === '/om-oss');
    links.splice(i < 0 ? links.length : i, 0, { href: '/live', label: kamera.label, live: kamera.live });
  }
  // Med mange faner får ikke alle plass på mellomstore skjermer – da brukes menyknappen litt lenger
  const mange = links.length > 6;

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
    <motion.header
      initial={{ y: -90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50 px-3 pt-2.5 sm:px-4"
    >
      <nav
        className={`glass-nav glass-rim mx-auto flex w-full max-w-6xl items-center justify-between gap-2 rounded-full pl-3 pr-2 sm:gap-4 sm:pl-4 sm:pr-2.5 ${
          scrolled ? 'is-scrolled h-[54px] max-w-[1080px]' : 'h-[60px]'
        }`}
      >
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
          <span className="text-base font-bold tracking-tight max-[379px]:hidden sm:hidden">{businessName}</span>
        </Link>

        <div className={`hidden items-center gap-1 ${mange ? 'xl:flex' : 'md:flex'}`}>
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
                    className="glass-pill absolute inset-0 rounded-full"
                    transition={{ type: 'spring', stiffness: 420, damping: 24, mass: 0.8 }}
                  />
                )}
                <span className="relative whitespace-nowrap">
                  {link.label}
                  {link.live && <LivePrikk />}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
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
            className="btn-ghost btn-sm max-sm:!px-3 lg:hidden"
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

          <Link href="/bestill" className="btn-primary btn-sm relative" data-mag>
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
            className={`btn-ghost btn-sm max-sm:!px-3 ${mange ? 'xl:hidden' : 'md:hidden'}`}
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
            className={`glass mx-auto mt-2 max-w-6xl overflow-hidden rounded-3xl ${mange ? 'xl:hidden' : 'md:hidden'}`}
          >
            <div className="flex flex-col gap-1 p-3">
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
                  {link.live && <LivePrikk />}
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
    </motion.header>
  );
}
