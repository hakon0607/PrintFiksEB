'use client';

import { Okonomi } from '@/components/admin/Okonomi';

export default function OkonomiSide() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Økonomi</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          Her ser dere hva som kommer inn, hva som går ut og hva dere sitter igjen med. Betalte
          bestillinger telles automatisk – filament, emballasje og utstyr fører dere inn selv. Denne
          siden ser bare dere, aldri kundene.
        </p>
      </div>

      <Okonomi />
    </div>
  );
}
