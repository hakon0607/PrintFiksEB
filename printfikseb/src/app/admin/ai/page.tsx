'use client';

import { AiOgImport } from '@/components/admin/AiOgImport';

export default function AiSide() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI og import</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          Her legger dere inn AI-nøkkelen én gang, og henter ferdige modeller fra nettet rett inn i
          galleriet.
        </p>
      </div>

      <AiOgImport />
    </div>
  );
}
