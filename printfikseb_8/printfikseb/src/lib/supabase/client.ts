'use client';

import { createBrowserClient } from '@supabase/ssr';

export const supabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: ReturnType<typeof createBrowserClient> | null = null;

/** Supabase-klient for nettleseren. Returnerer null hvis Supabase ikke er satt opp ennå. */
export function getBrowserClient() {
  if (!supabaseConfigured) return null;
  if (!cached) {
    cached = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return cached;
}
