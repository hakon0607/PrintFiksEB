'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart, type CartItem, type PrintItem, type ProductItem, type RepairItem } from '@/lib/cart';
import { itemPrice, orderTotals } from '@/lib/pricing';
import { buildOrderMessage, smsHref } from '@/lib/message';
import { AnimatedNumber } from './AnimatedNumber';
import { formatPhone, telHref } from '@/lib/settings';
import { OrderBuilder } from './OrderBuilder';
import type { DeliveryOption, Material, WeightRange, Extra } from '@/lib/types';

type Props = {
  deliveryOptions: DeliveryOption[];
  materials: Material[];
  weightRanges: WeightRange[];
  extras: Extra[];
  repairPriceText: string;
  repairText: string;
  forhandsvalgtMaterial?: string;
  forhandsvalgtStorrelse?: string;
  startFee: number;
  useStartFee: boolean;
  currency: string;
  phone: string;
  businessName: string;
  paymentText: string;
  approvalText: string;
  radiusKm: number;
  daysMin: number;
  daysMax: number;
  vippsNumber: string;
  phoneHours: string;
  messageHours: string;
  callbackText: string;
};

const FORM_KEY = 'printfikseb_bestillingsskjema_v1';

export function OrderFlow({
  deliveryOptions,
  materials,
  weightRanges,
  extras,
  repairPriceText,
  repairText,
  forhandsvalgtMaterial,
  forhandsvalgtStorrelse,
  startFee,
  useStartFee,
  currency,
  phone,
  businessName,
  paymentText,
  approvalText,
  radiusKm,
  daysMin,
  daysMax,
  vippsNumber,
  phoneHours,
  messageHours,
  callbackText,
}: Props) {
  const { items, remove, setQty, clear, ready } = useCart();

  const [navn, setNavn] = useState('');
  const [adresse, setAdresse] = useState('');
  const [tlf, setTlf] = useState('');
  const [leveringId, setLeveringId] = useState(deliveryOptions[0]?.id ?? '');
  const [betaling, setBetaling] = useState('Vipps');
  const [kommentar, setKommentar] = useState('');
  const [kopiert, setKopiert] = useState(false);
  const [visMelding, setVisMelding] = useState(false);

  // Husk skjemaet mellom besøk (bare på denne maskinen)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FORM_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.navn) setNavn(d.navn);
        if (d.adresse) setAdresse(d.adresse);
        if (d.tlf) setTlf(d.tlf);
        if (d.betaling) setBetaling(d.betaling);
      }
    } catch {
      /* ikke kritisk */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(FORM_KEY, JSON.stringify({ navn, adresse, tlf, betaling }));
    } catch {
      /* ikke kritisk */
    }
  }, [navn, adresse, tlf, betaling]);

  const levering = deliveryOptions.find((d) => d.id === leveringId) ?? deliveryOptions[0];
  const leveringPris = Number(levering?.price ?? 0);
  const krevVadresse = leveringPris > 0;

  const totals = useMemo(
    () =>
      orderTotals(items, {
        startFee: useStartFee ? startFee : 0,
        deliveryFee: leveringPris,
      }),
    [items, startFee, useStartFee, leveringPris]
  );

  const melding = useMemo(
    () =>
      buildOrderMessage(
        items,
        {
          name: navn,
          address: adresse,
          phone: tlf,
          deliveryName: levering?.name ?? '',
          deliveryPrice: leveringPris,
          payment: betaling,
          comment: kommentar,
        },
        { startFee: useStartFee ? startFee : 0, businessName, currency }
      ),
    [
      items,
      navn,
      adresse,
      tlf,
      levering,
      leveringPris,
      betaling,
      kommentar,
      startFee,
      useStartFee,
      businessName,
      currency,
    ]
  );

  const manglerNavn = !navn.trim();
  const manglerAdresse = krevVadresse && !adresse.trim();
  const klar = items.length > 0 && !manglerNavn && !manglerAdresse;

  async function kopier() {
    try {
      await navigator.clipboard.writeText(melding);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = melding;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* siste utvei: brukeren kan markere teksten selv */
      }
      document.body.removeChild(ta);
    }
    setKopiert(true);
    window.setTimeout(() => setKopiert(false), 2400);
  }

  const bygger = (
    <OrderBuilder
      materials={materials}
      weightRanges={weightRanges}
      extras={extras}
      currency={currency}
      repairPriceText={repairPriceText}
      repairText={repairText}
      forhandsvalgtMaterial={forhandsvalgtMaterial}
      forhandsvalgtStorrelse={forhandsvalgtStorrelse}
    />
  );

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-3xl bg-white/60" />;
  }

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        {bygger}

        <div className="rounded-3xl border border-dashed border-ink-200 bg-white/80 px-6 py-12 text-center">
          <h2 className="text-lg font-semibold">Du har ikke lagt til noe ennå</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
            Bruk skjemaet over, eller plukk en ferdig modell fra galleriet. Vil du heller snakke med
            oss, er det bare å ringe.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/galleri" className="btn-ghost">
              Se galleriet
            </Link>
            <a href={telHref(phone)} className="btn-soft">
              Ring {formatPhone(phone)}
            </a>
          </div>
          <p className="mx-auto mt-5 max-w-md text-xs leading-relaxed text-ink-400">
            {messageHours} {phoneHours}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-start">
      {/* ---------- Venstre ---------- */}
      <div className="space-y-5">
        {bygger}

        <section className="card p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold">Dette har du valgt</h2>
            <button
              type="button"
              onClick={clear}
              className="text-xs font-semibold text-ink-400 transition-colors hover:text-red-500"
            >
              Tøm listen
            </button>
          </div>

          <ul className="mt-4 divide-y divide-ink-100">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.li
                  key={item.key}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <Linje
                    item={item}
                    currency={currency}
                    onRemove={() => remove(item.key)}
                    onQty={(q) => setQty(item.key, q)}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>

        <section className="card p-6">
          <h2 className="text-base font-semibold">Hvor skal det leveres?</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {deliveryOptions.map((d) => {
              const valgt = d.id === leveringId;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setLeveringId(d.id)}
                  className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
                    valgt
                      ? 'border-brand-500 bg-brand-50 ring-4 ring-brand-100'
                      : 'border-ink-200 bg-white hover:border-brand-300'
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold text-ink-900">{d.name}</span>
                    <span
                      className={`shrink-0 text-sm font-bold ${
                        Number(d.price) === 0 ? 'text-emerald-600' : 'text-brand-700'
                      }`}
                    >
                      {Number(d.price) === 0 ? 'Gratis' : `${Math.round(Number(d.price))} ${currency}`}
                    </span>
                  </span>
                  <span className="mt-1.5 block text-xs leading-relaxed text-ink-500">
                    {d.description}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="hint">
            Hjemlevering gjelder innenfor {radiusKm} km. Bor du litt lenger unna? Skriv det i
            meldingen, så finner vi ut av det.
          </p>
        </section>

        <section className="card p-6">
          <h2 className="text-base font-semibold">Om deg</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="navn">
                Navn <span className="text-red-500">*</span>
              </label>
              <input
                id="navn"
                value={navn}
                onChange={(e) => setNavn(e.target.value)}
                placeholder="Ola Nordmann"
                className="field"
                autoComplete="name"
              />
            </div>
            <div>
              <label className="label" htmlFor="tlf">
                Telefon
              </label>
              <input
                id="tlf"
                value={tlf}
                onChange={(e) => setTlf(e.target.value)}
                placeholder="Valgfritt"
                className="field"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="adresse">
                Adresse {krevVadresse && <span className="text-red-500">*</span>}
              </label>
              <input
                id="adresse"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder="Vestre Sandslimarka 44"
                className="field"
                autoComplete="street-address"
              />
              <p className="hint">
                {krevVadresse
                  ? 'Vi trenger adressen for å kunne levere hjem til deg.'
                  : 'Du kan hoppe over denne når du henter selv.'}
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Betaling</label>
              <div className="flex flex-wrap gap-2">
                {['Vipps', 'Kontant'].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBetaling(b)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                      betaling === b
                        ? 'border-brand-500 bg-brand-50 text-brand-700 ring-4 ring-brand-100'
                        : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
              <p className="hint">
                {betaling === 'Vipps'
                  ? `Vipps til ${formatPhone(vippsNumber)} når du får varene.`
                  : 'Husk å si fra på forhånd, så har vi veksel klart.'}
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="kommentar">
                Noe mer vi bør vite?
              </label>
              <textarea
                id="kommentar"
                rows={3}
                value={kommentar}
                onChange={(e) => setKommentar(e.target.value)}
                placeholder="F.eks. ønsket farge, når du trenger det, eller at du vil sende bilde."
                className="field resize-none"
              />
            </div>
          </div>
        </section>
      </div>

      {/* ---------- Høyre: sammendrag + melding ---------- */}
      <div className="space-y-5 lg:sticky lg:top-24">
        <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-lift">
          <div className="relative overflow-hidden bg-ink-900 px-6 py-7 text-white">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(24rem 12rem at 15% 0%, rgba(61,118,241,0.45), transparent 62%)',
              }}
            />
            <div className="relative">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-300">
                Estimert total
              </p>
              <p className="mt-2 text-4xl font-bold leading-none">
                {totals.isRange ? (
                  <>
                    <AnimatedNumber value={totals.totalMin} />
                    <span className="mx-1 text-ink-400">–</span>
                    <AnimatedNumber value={totals.totalMax} />
                  </>
                ) : (
                  <AnimatedNumber value={totals.totalMin} />
                )}
                <span className="ml-1.5 text-lg font-semibold text-ink-300">{currency}</span>
              </p>
              <p className="mt-2 text-xs leading-relaxed text-ink-400">{approvalText}</p>
            </div>
          </div>

          <dl className="divide-y divide-ink-100 px-6 py-4 text-sm">
            <Rad
              navn={`Varer (${items.reduce((s, i) => s + i.qty, 0)} stk)`}
              verdi={
                Math.round(totals.itemsMin) === Math.round(totals.itemsMax)
                  ? `${Math.round(totals.itemsMin)} ${currency}`
                  : `${Math.round(totals.itemsMin)}–${Math.round(totals.itemsMax)} ${currency}`
              }
            />
            {totals.extras.map((e) => (
              <Rad key={e.id} navn={e.name} verdi={`${Math.round(e.price)} ${currency}`} />
            ))}
            {totals.startFee > 0 && (
              <Rad navn="Startpris" verdi={`${Math.round(totals.startFee)} ${currency}`} />
            )}
            <Rad
              navn={levering?.name ?? 'Levering'}
              verdi={leveringPris === 0 ? 'Gratis' : `${Math.round(leveringPris)} ${currency}`}
            />
            {totals.hasUnknown && <Rad navn="Reparasjon" verdi="Etter avtale" tone="muted" />}
          </dl>

          <div className="border-t border-ink-100 bg-ink-50/60 p-6">
            {!klar && (
              <p className="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
                {manglerNavn
                  ? 'Fyll inn navnet ditt for å sende bestillingen.'
                  : 'Fyll inn adressen din for hjemlevering.'}
              </p>
            )}

            <a
              href={klar ? smsHref(phone, melding) : undefined}
              aria-disabled={!klar}
              onClick={(e) => {
                if (!klar) e.preventDefault();
              }}
              className={`btn-primary w-full ${klar ? '' : 'pointer-events-none opacity-50'}`}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.2-.6L3 21l1.8-5.1A8.2 8.2 0 0 1 3.6 11.5 8.4 8.4 0 0 1 12.6 3a8.4 8.4 0 0 1 8.4 8.5z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
              Send bestilling på SMS
            </a>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <a href={telHref(phone)} className="btn-ghost w-full">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M6.5 3.5h3l1.5 4-2 1.4a12 12 0 0 0 6.1 6.1l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                </svg>
                Ring i stedet
              </a>
              <button type="button" onClick={kopier} className="btn-ghost w-full">
                {kopiert ? 'Kopiert ✓' : 'Kopier meldingen'}
              </button>
            </div>

            <p className="mt-3 text-center text-xs leading-relaxed text-ink-500">
              SMS-knappen åpner meldingsappen med alt ferdig utfylt til{' '}
              <span className="font-semibold text-ink-700">{formatPhone(phone)}</span>. Du kan like
              gjerne ringe oss og si hva du vil ha – vi noterer det da.
            </p>

            <div className="mt-4 space-y-2 rounded-2xl bg-white p-4 text-xs leading-relaxed text-ink-600">
              <p className="flex gap-2">
                <span aria-hidden className="font-bold text-brand-600">24/7</span>
                <span>{messageHours}</span>
              </p>
              <p className="flex gap-2">
                <span aria-hidden className="font-bold text-brand-600">☎</span>
                <span>
                  {phoneHours} {callbackText}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-ink-100 bg-white shadow-soft">
          <button
            type="button"
            onClick={() => setVisMelding((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
          >
            <span className="text-sm font-semibold">Se meldingen som sendes</span>
            <motion.span animate={{ rotate: visMelding ? 180 : 0 }} className="text-ink-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {visMelding && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <pre className="mx-6 mb-6 max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-ink-50 p-4 font-sans text-[13px] leading-relaxed text-ink-700">
                  {melding}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="rounded-3xl border border-brand-200 bg-brand-50/70 p-6 text-sm leading-relaxed text-ink-700">
          <h3 className="font-semibold text-ink-900">Hva skjer nå?</h3>
          <ol className="mt-3 space-y-2">
            <li>1. Du sender meldingen – eller ringer oss på {formatPhone(phone)}.</li>
            <li>2. Vi svarer med endelig pris og stiller spørsmål hvis noe er uklart.</li>
            <li>3. Du godkjenner prisen – først da starter vi.</li>
            <li>
              4. Ferdig på {daysMin}–{daysMax} virkedager.
            </li>
          </ol>
          <p className="mt-4 text-xs text-ink-500">{paymentText}</p>
        </div>
      </div>
    </div>
  );
}

function Linje({
  item,
  currency,
  onRemove,
  onQty,
}: {
  item: CartItem;
  currency: string;
  onRemove: () => void;
  onQty: (qty: number) => void;
}) {
  const pris = itemPrice(item);

  const bilde = item.kind === 'product' ? (item as ProductItem).imageUrl : undefined;
  const undertekst =
    item.kind === 'product'
      ? `ID ${(item as ProductItem).code}`
      : item.kind === 'repair'
        ? (item as RepairItem).description
        : beskrivPrint(item as PrintItem);

  return (
    <div className="flex gap-4 py-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-brand-50">
        {bilde ? (
          <Image src={bilde} alt="" fill sizes="64px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-brand-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 2.8 20 7v10l-8 4.2L4 17V7z M12 12l8-5m-8 5-8-5m8 5v9.2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink-900">{item.title}</h3>
          <span className="shrink-0 text-sm font-bold text-ink-900">
            {pris.unknown
              ? 'Etter avtale'
              : Math.round(pris.min) === Math.round(pris.max)
                ? `${Math.round(pris.min)} ${currency}`
                : `${Math.round(pris.min)}–${Math.round(pris.max)} ${currency}`}
          </span>
        </div>
        {undertekst && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-500">{undertekst}</p>
        )}
        {item.kind === 'print' && (item as PrintItem).note && (
          <p className="mt-1 line-clamp-2 text-xs italic text-ink-400">
            «{(item as PrintItem).note}»
          </p>
        )}

        <div className="mt-2.5 flex items-center gap-3">
          {item.kind !== 'repair' && (
            <div className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => onQty(item.qty - 1)}
                className="h-7 w-7 rounded-full text-sm font-bold text-ink-500 hover:bg-ink-50"
                aria-label="Færre"
              >
                −
              </button>
              <span className="w-6 text-center text-xs font-bold">{item.qty}</span>
              <button
                type="button"
                onClick={() => onQty(item.qty + 1)}
                className="h-7 w-7 rounded-full text-sm font-bold text-ink-500 hover:bg-ink-50"
                aria-label="Flere"
              >
                +
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-semibold text-ink-400 transition-colors hover:text-red-500"
          >
            Fjern
          </button>
        </div>
      </div>
    </div>
  );
}

function beskrivPrint(item: PrintItem) {
  const vekt = item.minG === item.maxG ? `${item.maxG} g` : `${item.minG}–${item.maxG} g`;
  const extras = item.extras.map((e) => e.name).join(', ');
  return `${item.materialName} · ${vekt}${extras ? ` · ${extras}` : ''}`;
}

function Rad({ navn, verdi, tone }: { navn: string; verdi: string; tone?: 'muted' }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className={tone === 'muted' ? 'text-ink-400' : 'text-ink-600'}>{navn}</dt>
      <dd className={`shrink-0 font-semibold ${tone === 'muted' ? 'text-ink-400' : 'text-ink-900'}`}>
        {verdi}
      </dd>
    </div>
  );
}
