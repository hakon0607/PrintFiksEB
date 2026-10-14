'use client';

import { DekselModeller } from '@/components/admin/DekselModeller';

export default function DekslerSide() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dekselgenerator</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          Her legger dere inn mobilene kundene kan lage deksel til på <span className="font-semibold">printfiks.org/deksel</span>.
          Når noen bestiller, finner dere designet under Bestillinger – der trykker dere «Last ned printfil» og åpner den i
          Bambu Studio. Priser og filamentfarger endrer dere under Priser.
        </p>
      </div>
      <DekselModeller />
    </div>
  );
}
