'use client';

import { PrintBotSamtale } from '@/components/admin/PrintBot';

export default function PrintBotSide() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ink-900">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="4" y="7" width="16" height="12" rx="3" stroke="white" strokeWidth="1.8" />
            <path
              d="M12 3v4M9 12.5h.01M15 12.5h.01"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path d="M9.5 16h5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <div>
          <h1 className="text-3xl font-bold">PrintBot</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
            Spør om hva som helst i adminpanelet. PrintBot kan vise deg veien til riktig side,
            forklare hvordan ting virker, og gjøre endringer for deg – men den spør alltid først,
            og du ser nøyaktig hva som vil skje før du sier ja.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft sm:p-6">
        <PrintBotSamtale full />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            t: 'Den kan svare',
            d: 'Hvordan legger jeg ut en modell? Hva betyr publisering? Hvor endrer jeg telefonnummeret?',
          },
          {
            t: 'Den kan gjøre',
            d: 'Endre priser, lage oppgaver, legge til spørsmål og svar, skru modeller av og på.',
          },
          {
            t: 'Den spør alltid',
            d: 'Du ser den gamle verdien ved siden av den nye, og ingenting skjer før du trykker ja.',
          },
        ].map((k) => (
          <div key={k.t} className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
            <h2 className="text-sm font-bold text-ink-900">{k.t}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{k.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
