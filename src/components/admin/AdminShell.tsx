'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAdmin } from './AdminProvider';
import { Login } from './Login';
import { PublishBar } from './PublishBar';
import { Tilstede } from './Tilstede';
import { PrintBot } from './PrintBot';

const meny = [
  { href: '/admin', label: 'Oversikt', ikon: 'M4 12h6V4H4zM14 20h6v-8h-6zM14 8h6V4h-6zM4 20h6v-4H4z' },
  {
    href: '/admin/bestillinger',
    label: 'Bestillinger',
    ikon: 'M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM15 2v5h5M9 13l2 2 4-4',
  },
  {
    href: '/admin/printbot',
    label: 'PrintBot',
    ikon: 'M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5v7a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 15.5zM12 3v3M9 11.5h.01M15 11.5h.01M9.5 15h5',
  },
  {
    href: '/admin/oppgaver',
    label: 'Oppgaver',
    ikon: 'M9 5h9M9 12h9M9 19h9M4 5l1.2 1.2L7.5 4M4 12l1.2 1.2L7.5 11M4 19l1.2 1.2L7.5 18',
  },
  {
    href: '/admin/okonomi',
    label: 'Økonomi',
    ikon: 'M4 19V9m5 10V5m5 14v-7m5 7V8',
  },
  { href: '/admin/priser', label: 'Priser', ikon: 'M12 3v18M7 7h7.5a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h8' },
  { href: '/admin/galleri', label: 'Galleri', ikon: 'M4 5h16v14H4zM4 15l4.5-4.5L13 15l3-3 4 4' },
  { href: '/admin/tekster', label: 'Tekster', ikon: 'M5 6h14M5 12h14M5 18h9' },
  { href: '/admin/sporsmal', label: 'Spørsmål og svar', ikon: 'M9.5 9a2.5 2.5 0 1 1 3.3 2.4c-.8.3-1.3 1-1.3 1.9v.2M12 17h.01' },
  { href: '/admin/epost', label: 'E-post', ikon: 'M3 7l9 6 9-6M3 7h18v10H3z' },
  { href: '/admin/ansatte', label: 'Ansatte', ikon: 'M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M20 19v-1.5a3.5 3.5 0 0 0-2.6-3.4' },
  { href: '/admin/profil', label: 'Min profil', ikon: 'M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-1A3.5 3.5 0 0 0 8 17.5V19M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7' },
  { href: '/admin/innstillinger', label: 'Kontakt og levering', ikon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 15a2 2 0 1 1 0-4 1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9 4.6 2 2 0 1 1 13 3a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 21 9a2 2 0 1 1 0 4' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading, configured, profile, signOut, supabase } = useAdmin();
  const pathname = usePathname();
  const [menyApen, setMenyApen] = useState(false);
  const [nyeBestillinger, setNyeBestillinger] = useState(0);

  // Teller bestillinger som ikke er sett på ennå
  const tellNye = useCallback(async () => {
    if (!supabase || !user) return;
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ny');
    setNyeBestillinger(count ?? 0);
  }, [supabase, user]);

  useEffect(() => {
    tellNye();
    const id = window.setInterval(tellNye, 60000);
    return () => window.clearInterval(id);
  }, [tellNye]);

  if (!configured) return <IkkeKoblet />;

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-ink-50/50">
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenyApen((v) => !v)}
              className="btn-ghost btn-sm lg:hidden"
              aria-label="Meny"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <Link href="/admin" className="flex items-center gap-2.5">
              <span className="relative block h-8 w-8 overflow-hidden rounded-xl">
                <Image src="/logo-mark.png" alt="" fill sizes="32px" className="object-contain" />
              </span>
              <span className="text-sm font-bold">Adminpanel</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Tilstede />
            <Link href="/" className="btn-ghost btn-sm hidden lg:inline-flex">
              Se nettsiden
            </Link>
            <Link
              href="/admin/profil"
              className="hidden items-center gap-2 rounded-full bg-ink-50 px-3 py-1.5 text-xs font-semibold text-ink-600 transition-colors hover:bg-ink-100 xl:flex"
            >
              {profile?.name || user.email}
            </Link>
            <button type="button" onClick={signOut} className="btn-ghost btn-sm">
              Logg ut
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl gap-8 px-4 py-8 sm:px-6">
        <aside
          className={`${
            menyApen ? 'block' : 'hidden'
          } fixed inset-x-0 top-16 z-30 border-b border-ink-100 bg-white p-4 lg:static lg:z-auto lg:block lg:w-60 lg:shrink-0 lg:border-0 lg:bg-transparent lg:p-0`}
        >
          <nav className="space-y-1 lg:sticky lg:top-24">
            {meny.map((m) => {
              const aktiv = pathname === m.href;
              return (
                <Link
                  key={m.href}
                  href={m.href}
                  onClick={() => setMenyApen(false)}
                  className={`relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                    aktiv ? 'text-brand-700' : 'text-ink-600 hover:bg-white hover:text-ink-900'
                  }`}
                >
                  {aktiv && (
                    <motion.span
                      layoutId="admin-aktiv"
                      className="absolute inset-0 rounded-2xl bg-white shadow-soft ring-1 ring-brand-100"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                    className="relative"
                  >
                    <path
                      d={m.ikon}
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="relative">{m.label}</span>
                  {m.href === '/admin/bestillinger' && nyeBestillinger > 0 && (
                    <span className="relative ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
                      {nyeBestillinger}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 space-y-6 pb-24">
          <PublishBar />
          {children}
        </main>
      </div>

      {pathname !== '/admin/printbot' && <PrintBot />}
    </div>
  );
}

function IkkeKoblet() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl rounded-[2rem] border border-amber-200 bg-amber-50 p-8">
        <h1 className="text-2xl font-bold text-amber-900">Databasen er ikke koblet til ennå</h1>
        <p className="mt-3 text-sm leading-relaxed text-amber-800">
          Nettsiden fungerer, men for å kunne logge inn og endre priser, galleri og tekster må
          Supabase kobles til. Det gjøres bare én gang.
        </p>
        <ol className="mt-5 space-y-2.5 text-sm text-amber-900">
          <li>1. Lag et gratis prosjekt på supabase.com</li>
          <li>2. Kjør filen <code className="rounded bg-white px-1.5 py-0.5">supabase/schema.sql</code> i SQL Editor</li>
          <li>
            3. Legg inn nøklene som miljøvariabler i Vercel (se <code className="rounded bg-white px-1.5 py-0.5">OPPSETT.md</code>)
          </li>
        </ol>
        <Link href="/" className="btn-dark mt-7">
          Tilbake til nettsiden
        </Link>
      </div>
    </div>
  );
}
