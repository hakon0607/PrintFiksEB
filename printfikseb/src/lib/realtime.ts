'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

export type TabellEndring = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  ny: Record<string, unknown> | null;
  gammel: Record<string, unknown> | null;
};

/**
 * Lytter på endringer i en tabell, slik at alle som er inne i adminpanelet
 * ser det samme til enhver tid.
 */
export function lyttPaTabell(
  supabase: SupabaseClient,
  tabell: string,
  ved: (endring: TabellEndring) => void
) {
  const kanal = supabase
    .channel(`tabell:${tabell}:${Math.random().toString(36).slice(2, 8)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tabell },
      (nyttet: {
        eventType: string;
        new: Record<string, unknown> | null;
        old: Record<string, unknown> | null;
      }) => {
        ved({
          type: nyttet.eventType as TabellEndring['type'],
          ny: nyttet.new ?? null,
          gammel: nyttet.old ?? null,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(kanal);
  };
}
