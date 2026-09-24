'use client';

import { EpostOppsett } from '@/components/admin/EpostOppsett';

export default function EpostSide() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">E-post</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          Når noen bestiller på nettsiden, får dere et varsel på e-post. Kunden får kvitteringen på
          melding fra dere – den kopierer dere fra bestillingen. Her ser dere om varselet virker.
        </p>
      </div>

      <EpostOppsett />
    </div>
  );
}
