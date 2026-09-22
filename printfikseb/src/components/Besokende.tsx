'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';

/**
 * Melder fra at noen er inne på nettsiden, slik at dere ser antall besøkende
 * i adminpanelet. Ingenting vises for kunden, og ingenting lagres.
 */
export function Besokende() {
  const pathname = usePathname();

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return;

    const kanal = supabase.channel('besokende');
    kanal.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        kanal.track({ side: pathname, tid: Date.now() }).catch(() => undefined);
      }
    });

    return () => {
      supabase.removeChannel(kanal);
    };
  }, [pathname]);

  return null;
}
