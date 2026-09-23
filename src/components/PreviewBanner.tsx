'use client';

import { useSearchParams } from 'next/navigation';

/** Viser en tydelig stripe når man ser på en forhåndsvisning fra adminpanelet. */
export function PreviewBanner() {
  const params = useSearchParams();
  if (!params.get('forhandsvis')) return null;

  return (
    <div className="sticky top-0 z-[60] bg-amber-400 px-4 py-2 text-center text-[13px] font-semibold text-amber-950">
      Forhåndsvisning – dette er ikke publisert ennå.{' '}
      <a href="/admin" className="underline underline-offset-2">
        Gå til adminpanelet for å publisere
      </a>
    </div>
  );
}
