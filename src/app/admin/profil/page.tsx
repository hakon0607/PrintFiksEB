'use client';

import { MinProfil } from '@/components/admin/MinProfil';

export default function ProfilSide() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Min profil</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          Her endrer du ditt eget navn, bilde og hva du gjør i bedriften. Du kan også bytte passord.
        </p>
      </div>

      <MinProfil />
    </div>
  );
}
