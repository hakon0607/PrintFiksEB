'use client';

import { TableEditor } from '@/components/admin/TableEditor';

export default function SporsmalSide() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Spørsmål og svar</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          Får dere det samme spørsmålet på melding flere ganger? Legg det inn her, så slipper dere å
          svare på nytt hver gang.
        </p>
      </div>

      <TableEditor
        table="faq"
        tittel="Spørsmål på «Om oss»"
        enhetsnavn="spørsmål"
        tittelFelt="question"
        nyRad={{ question: 'Nytt spørsmål', answer: '', active: true }}
        felter={[
          { key: 'question', label: 'Spørsmål', type: 'text', bred: true },
          { key: 'answer', label: 'Svar', type: 'longtext' },
        ]}
      />
    </div>
  );
}
