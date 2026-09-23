'use client';

import { EpostOppsett } from '@/components/admin/EpostOppsett';

export default function EpostSide() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">E-post</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          Når noen bestiller på nettsiden, får kunden en kvittering og dere et varsel. Her ser dere
          om det virker, og dere kan sende en test.
        </p>
      </div>

      <EpostOppsett />
    </div>
  );
}
