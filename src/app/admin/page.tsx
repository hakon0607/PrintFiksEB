'use client';

import { motion } from 'framer-motion';
import { useAdmin } from '@/components/admin/AdminProvider';
import { Oversikt } from '@/components/admin/Oversikt';

export default function AdminOversikt() {
  const { profile } = useAdmin();
  const i_dag = new Date().toLocaleDateString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">
          Hei{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}!
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
          <span className="capitalize">{i_dag}</span> – her er status for hele bedriften.
        </p>
      </motion.div>

      <Oversikt />
    </div>
  );
}
