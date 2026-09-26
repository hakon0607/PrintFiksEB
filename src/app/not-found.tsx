import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Ikke noe å printe her',
};

/**
 * Vises når noen går til en adresse som ikke finnes.
 * Vi skriver det på norsk i stedet for «404».
 */
export default function IkkeFunnet() {
  return (
    <main className="relative grid min-h-[70vh] place-items-center overflow-hidden px-5 py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-100/50 blur-3xl"
      />

      <Link
        href="/"
        aria-label="Til forsiden"
        className="absolute left-1/2 top-8 -translate-x-1/2 opacity-90 transition-opacity hover:opacity-100"
      >
        <Image src="/logo-text.png" alt="PrintFiksEB" width={148} height={29} priority />
      </Link>

      <div className="relative w-full max-w-lg text-center">
        {/* Tom byggeplate med en dyse over */}
        <svg
          width="132"
          height="112"
          viewBox="0 0 132 112"
          fill="none"
          aria-hidden
          className="mx-auto text-brand-300"
        >
          <path
            d="M46 12h40M54 12l6 17h12l6-17"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="66" cy="38" r="3.6" fill="currentColor" className="text-brand-400" />
          <path
            d="M18 88h96"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            className="text-ink-200"
          />
          <path
            d="M30 74h72"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="7 9"
          />
        </svg>

        <h1 className="mt-7 text-balance text-3xl font-bold leading-tight sm:text-4xl">
          Ikke noe å printe her
        </h1>

        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-ink-600">
          Byggeplata er tom. Siden du prøvde å åpne finnes ikke – kanskje lenken er skrevet feil,
          eller så har vi flyttet på noe.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/galleri" className="btn-primary">
            Se galleriet
          </Link>
          <Link href="/" className="btn-ghost">
            Til forsiden
          </Link>
        </div>

        <p className="mt-8 text-sm text-ink-500">
          Lette du etter noe bestemt?{' '}
          <Link href="/bestill" className="font-semibold text-brand-700 underline underline-offset-4">
            Beskriv det, så lager vi det
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
