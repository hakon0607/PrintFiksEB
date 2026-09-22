'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAdmin } from '@/components/admin/AdminProvider';

type Tall = { produkter: number; ansatte: number; oppgaver: number; sporsmal: number };

export default function AdminOversikt() {
  const { supabase, profile, user } = useAdmin();
  const [tall, setTall] = useState<Tall>({ produkter: 0, ansatte: 0, oppgaver: 0, sporsmal: 0 });

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const [p, a, o, f] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('team_members').select('id', { count: 'exact', head: true }),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('done', false),
        supabase.from('faq').select('id', { count: 'exact', head: true }),
      ]);
      setTall({
        produkter: p.count ?? 0,
        ansatte: a.count ?? 0,
        oppgaver: o.count ?? 0,
        sporsmal: f.count ?? 0,
      });
    })();
  }, [supabase]);

  const snarveier = [
    {
      href: '/admin/oppgaver',
      tittel: 'Planlegg oppgaver',
      tekst: 'Skriv ned hva som skal gjøres, gi det til noen og huk av når det er ferdig.',
    },
    {
      href: '/admin/priser',
      tittel: 'Endre priser',
      tekst: 'Pris per gram, startpris, design, levering og vektintervaller.',
    },
    {
      href: '/admin/galleri',
      tittel: 'Legg til modeller',
      tekst: 'Last opp bilde, sett pris og få et ID-nummer automatisk.',
    },
    {
      href: '/admin/tekster',
      tittel: 'Endre tekstene',
      tekst: 'Overskriften på forsiden, «om oss» og alt annet folk leser.',
    },
    {
      href: '/admin/ansatte',
      tittel: 'Legge til ansatte',
      tekst: 'Gi de andre i gruppa innlogging, og vis dem på «Om oss».',
    },
    {
      href: '/admin/sporsmal',
      tittel: 'Spørsmål og svar',
      tekst: 'Skriv svar på det kundene spør om oftest.',
    },
    {
      href: '/admin/innstillinger',
      tittel: 'Kontakt og levering',
      tekst: 'Telefonnummer, Vipps, leveringstid og leveringsområde.',
    },
  ];

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">
          Hei{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}!
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          Her styrer du hele nettsiden. Alt du endrer her blir synlig på nettsiden med en gang – du
          trenger ikke å publisere noe.{' '}
          <span className="font-semibold text-ink-800">Endringene lagres automatisk.</span>
        </p>
      </motion.div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { t: tall.produkter, d: 'modeller i galleriet' },
          { t: tall.oppgaver, d: 'oppgaver å gjøre' },
          { t: tall.ansatte, d: 'ansatte' },
          { t: tall.sporsmal, d: 'spørsmål og svar' },
        ].map((n, i) => (
          <motion.div
            key={n.d}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft"
          >
            <p className="text-3xl font-bold text-ink-900">{n.t}</p>
            <p className="mt-1 text-sm text-ink-500">{n.d}</p>
          </motion.div>
        ))}
      </div>

      <h2 className="mt-12 text-lg font-semibold">Hva vil du gjøre?</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {snarveier.map((s, i) => (
          <motion.div
            key={s.href}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i }}
          >
            <Link
              href={s.href}
              className="group block h-full rounded-3xl border border-ink-100 bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift"
            >
              <h3 className="text-base font-semibold text-ink-900">{s.tittel}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.tekst}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                Åpne
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
                  <path
                    d="M5 12h14m0 0-5.5-5.5M19 12l-5.5 5.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-10 rounded-3xl border border-brand-200 bg-brand-50/70 p-6">
        <h2 className="text-base font-semibold">Godt å vite</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-700">
          <li>• Alt du skriver lagres av seg selv. Du ser «Lagret ✓» når det er gjort.</li>
          <li>• Bryteren ved siden av hver ting skjuler den fra nettsiden uten å slette noe.</li>
          <li>• Pilene opp/ned bestemmer rekkefølgen på nettsiden.</li>
          <li>• Er du usikker? Åpne nettsiden i en ny fane og se hvordan det ser ut.</li>
        </ul>
        <p className="mt-4 text-xs text-ink-500">Du er logget inn som {user?.email}.</p>
      </div>
    </div>
  );
}
