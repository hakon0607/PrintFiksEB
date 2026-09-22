'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useAdmin } from './AdminProvider';

type Person = { id: string; navn: string; side: string; farge: string };

const SIDENAVN: Record<string, string> = {
  '/admin': 'Oversikt',
  '/admin/oppgaver': 'Oppgaver',
  '/admin/priser': 'Priser',
  '/admin/galleri': 'Galleri',
  '/admin/eksempler': 'Hva vi kan fikse',
  '/admin/tekster': 'Tekster',
  '/admin/sporsmal': 'Spørsmål og svar',
  '/admin/ansatte': 'Ansatte',
  '/admin/innstillinger': 'Kontakt og levering',
  '/admin/profil': 'Min profil',
};

const FARGER = ['#2559C7', '#0E9F6E', '#D97706', '#7C3AED', '#DB2777', '#0891B2'];

function fargeFor(id: string) {
  let sum = 0;
  for (let i = 0; i < id.length; i += 1) sum += id.charCodeAt(i);
  return FARGER[sum % FARGER.length];
}

export function Tilstede() {
  const { supabase, user, profile } = useAdmin();
  const pathname = usePathname();
  const [folk, setFolk] = useState<Person[]>([]);
  const [besokende, setBesokende] = useState(0);
  const kanalRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);

  const meg = useMemo(
    () => ({
      id: user?.id ?? '',
      navn: profile?.name || user?.email?.split('@')[0] || 'Ukjent',
      farge: fargeFor(user?.id ?? 'x'),
    }),
    [user, profile]
  );

  /* ---- Hvem i gruppa er inne i adminpanelet ---- */
  useEffect(() => {
    if (!supabase || !user) return;

    const kanal = supabase.channel('admin-tilstede', {
      config: { presence: { key: user.id } },
    });
    kanalRef.current = kanal;

    kanal
      .on('presence', { event: 'sync' }, () => {
        const state = kanal.presenceState() as Record<
          string,
          { navn?: string; side?: string; farge?: string }[]
        >;
        const liste: Person[] = Object.entries(state).map(([id, innslag]) => ({
          id,
          navn: innslag[0]?.navn ?? 'Ukjent',
          side: innslag[0]?.side ?? '',
          farge: innslag[0]?.farge ?? fargeFor(id),
        }));
        setFolk(liste);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await kanal.track({ navn: meg.navn, side: pathname, farge: meg.farge });
        }
      });

    return () => {
      supabase.removeChannel(kanal);
      kanalRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, user, meg.navn, meg.farge]);

  /* ---- Oppdater hvilken side jeg er på ---- */
  useEffect(() => {
    kanalRef.current
      ?.track({ navn: meg.navn, side: pathname, farge: meg.farge })
      .catch(() => undefined);
  }, [pathname, meg.navn, meg.farge]);

  /* ---- Hvor mange er inne på selve nettsiden ---- */
  useEffect(() => {
    if (!supabase) return;
    const kanal = supabase.channel('besokende');
    kanal
      .on('presence', { event: 'sync' }, () => {
        setBesokende(Object.keys(kanal.presenceState()).length);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(kanal);
    };
  }, [supabase]);

  const andre = folk.filter((f) => f.id !== user?.id);

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 sm:flex"
        title="Hvor mange som er inne på nettsiden akkurat nå"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-xs font-bold text-emerald-700">{besokende} på nettsiden</span>
      </div>

      <div
        className="hidden items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 lg:flex"
        title={folk.map((f) => f.navn).join(', ')}
      >
        <span className="text-xs font-bold text-brand-700">{folk.length} pålogget</span>
      </div>

      {/* Hvem i gruppa som er pålogget */}
      <div className="flex items-center">
        <span
          className="relative flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white"
          style={{ background: meg.farge }}
          title={`${meg.navn} (deg)`}
        >
          {meg.navn.slice(0, 1).toUpperCase()}
        </span>

        <AnimatePresence>
          {andre.slice(0, 4).map((f) => (
            <motion.span
              key={f.id}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="relative -ml-2 flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white"
              style={{ background: f.farge }}
              title={`${f.navn}${f.side ? ` – ${SIDENAVN[f.side] ?? 'adminpanelet'}` : ''}`}
            >
              {f.navn.slice(0, 1).toUpperCase()}
            </motion.span>
          ))}
        </AnimatePresence>

        {andre.length > 4 && (
          <span className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink-200 text-[11px] font-bold text-ink-700 ring-2 ring-white">
            +{andre.length - 4}
          </span>
        )}
      </div>
    </div>
  );
}
