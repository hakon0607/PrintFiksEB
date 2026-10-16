'use client';

/** Små skjemakontroller til adminsiden «Live kamera». */
import { useEffect, useId, useState } from 'react';

export function Kort({
  tittel,
  beskrivelse,
  children,
  hoyre,
}: {
  tittel: string;
  beskrivelse?: React.ReactNode;
  children: React.ReactNode;
  hoyre?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-ink-100 bg-white p-6 shadow-soft sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{tittel}</h2>
          {beskrivelse && <p className="mt-1.5 max-w-2xl text-sm text-ink-500">{beskrivelse}</p>}
        </div>
        {hoyre}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function Bryter({
  label,
  hjelp,
  verdi,
  onEndre,
  deaktivert,
}: {
  label: string;
  hjelp?: string;
  verdi: boolean;
  onEndre: (v: boolean) => void;
  deaktivert?: boolean;
}) {
  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={verdi}
        disabled={deaktivert}
        onClick={() => onEndre(!verdi)}
        className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors disabled:opacity-50 ${
          verdi ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
        }`}
      >
        <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${verdi ? 'bg-brand-600' : 'bg-ink-200'}`}>
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${verdi ? 'left-[22px]' : 'left-0.5'}`}
          />
        </span>
        <span className="min-w-0 flex-1">{label}</span>
      </button>
      {hjelp && <p className="hint">{hjelp}</p>}
    </div>
  );
}

export function Glider({
  label,
  hjelp,
  verdi,
  min,
  maks,
  steg = 1,
  enhet = '',
  visning,
  onEndre,
}: {
  label: string;
  hjelp?: string;
  verdi: number;
  min: number;
  maks: number;
  steg?: number;
  enhet?: string;
  visning?: (v: number) => string;
  onEndre: (v: number) => void;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="label">
          {label}
        </label>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-ink-50 px-2.5 py-0.5 font-mono text-xs font-bold text-ink-700">
          {visning ? visning(verdi) : `${verdi}${enhet}`}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={maks}
        step={steg}
        value={verdi}
        onChange={(e) => onEndre(Number(e.target.value))}
        className="mt-1 w-full accent-brand-600"
      />
      {hjelp && <p className="hint">{hjelp}</p>}
    </div>
  );
}

export function Segment<T extends string | number>({
  label,
  hjelp,
  verdi,
  valg,
  onEndre,
  stor,
}: {
  label?: string;
  hjelp?: React.ReactNode;
  verdi: T;
  valg: { verdi: T; tekst: string; under?: string }[];
  onEndre: (v: T) => void;
  stor?: boolean;
}) {
  return (
    <div>
      {label && <span className="label">{label}</span>}
      <div
        role="radiogroup"
        aria-label={label}
        className={`grid gap-2 ${
          stor
            ? 'grid-cols-2 lg:grid-cols-4'
            : valg.length > 3
              ? 'grid-cols-2 sm:grid-cols-4'
              : valg.some((v) => (v.under?.length ?? 0) > 14)
                ? 'grid-cols-1 sm:grid-cols-3'
                : 'grid-cols-3'
        }`}
      >
        {valg.map((v) => {
          const aktiv = v.verdi === verdi;
          return (
            <button
              key={String(v.verdi)}
              type="button"
              role="radio"
              aria-checked={aktiv}
              onClick={() => onEndre(v.verdi)}
              className={`rounded-2xl border px-3 text-left transition-all ${stor ? 'py-3.5' : 'py-2.5'} ${
                aktiv
                  ? 'border-brand-500 bg-brand-50 text-brand-800 ring-4 ring-brand-100'
                  : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300'
              }`}
            >
              <span className="block text-sm font-bold">{v.tekst}</span>
              {v.under && <span className="mt-0.5 block text-xs font-medium text-ink-500">{v.under}</span>}
            </button>
          );
        })}
      </div>
      {hjelp && <div className="hint">{hjelp}</div>}
    </div>
  );
}

/** Tekstfelt som lagrer mens man skriver (men ikke for hvert tastetrykk). */
export function Tekstfelt({
  label,
  hjelp,
  verdi,
  onEndre,
  plassholder,
  maks,
  flerlinjet,
}: {
  label: string;
  hjelp?: string;
  verdi: string;
  onEndre: (v: string) => void;
  plassholder?: string;
  maks?: number;
  flerlinjet?: boolean;
}) {
  const id = useId();
  const [lokal, setLokal] = useState(verdi);
  const [skriver, setSkriver] = useState(false);
  useEffect(() => {
    if (!skriver) setLokal(verdi);
  }, [verdi, skriver]);
  const felles = {
    id,
    value: lokal,
    maxLength: maks,
    placeholder: plassholder,
    onFocus: () => setSkriver(true),
    onBlur: () => {
      setSkriver(false);
      if (lokal !== verdi) onEndre(lokal);
    },
    className: 'field',
  };
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {flerlinjet ? (
        <textarea
          {...felles}
          rows={3}
          className="field resize-y"
          onChange={(e) => {
            setLokal(e.target.value);
            onEndre(e.target.value);
          }}
        />
      ) : (
        <input
          {...felles}
          type="text"
          onChange={(e) => {
            setLokal(e.target.value);
            onEndre(e.target.value);
          }}
        />
      )}
      {hjelp && <p className="hint">{hjelp}</p>}
    </div>
  );
}

export function Klokkefelt({ label, verdi, onEndre }: { label: string; verdi: string; onEndre: (v: string) => void }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        type="time"
        value={verdi}
        onChange={(e) => e.target.value && onEndre(e.target.value)}
        className="field"
      />
    </div>
  );
}

const DAGER = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

export function Dagvelger({ verdi, onEndre }: { verdi: number[]; onEndre: (v: number[]) => void }) {
  return (
    <div>
      <span className="label">Dager</span>
      <div className="flex flex-wrap gap-2">
        {DAGER.map((d, i) => {
          const nr = i + 1;
          const valgt = verdi.includes(nr);
          return (
            <button
              key={d}
              type="button"
              aria-pressed={valgt}
              onClick={() => onEndre(valgt ? verdi.filter((x) => x !== nr) : [...verdi, nr].sort())}
              className={`h-10 min-w-[52px] rounded-full border px-3 text-sm font-bold transition-colors ${
                valgt ? 'border-brand-500 bg-brand-600 text-white' : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
