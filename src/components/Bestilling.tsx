'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  useCart,
  type CartItem,
  type PrintItem,
  type ProductItem,
  type RepairItem,
  type SelectedExtra,
} from '@/lib/cart';
import { useRouter } from 'next/navigation';
import { itemPrice, orderTotals } from '@/lib/pricing';
import { AnimatedNumber } from './AnimatedNumber';
import { formatPhone, telHref } from '@/lib/settings';
import type { DeliveryOption, Material, WeightRange, Extra, Color } from '@/lib/types';

type Props = {
  materials: Material[];
  weightRanges: WeightRange[];
  extras: Extra[];
  colors: Color[];
  deliveryOptions: DeliveryOption[];
  startFee: number;
  useStartFee: boolean;
  currency: string;
  phone: string;
  vippsNumber: string;
  businessName: string;
  paymentText: string;
  approvalText: string;
  repairPriceText: string;
  repairText: string;
  phoneHours: string;
  messageHours: string;
  callbackText: string;
  radiusKm: number;
  daysMin: number;
  daysMax: number;
  forhandsvalgtMaterial?: string;
  forhandsvalgtStorrelse?: string;
  forhandsvalgtTekst?: string;
};

type Modus = 'print' | 'reparasjon';

const FORM_KEY = 'printfikseb_bestillingsskjema_v1';

export function Bestilling(props: Props) {
  const {
    materials,
    weightRanges,
    extras,
    colors,
    deliveryOptions,
    startFee,
    useStartFee,
    currency,
    phone,
    vippsNumber,
    businessName,
    paymentText,
    approvalText,
    repairPriceText,
    repairText,
    phoneHours,
    messageHours,
    callbackText,
    radiusKm,
    daysMin,
    daysMax,
    forhandsvalgtMaterial,
    forhandsvalgtStorrelse,
    forhandsvalgtTekst,
  } = props;

  const router = useRouter();
  const { items, add, remove, setQty, clear, ready } = useCart();

  /* ---------------- Det du setter sammen nå ---------------- */
  const [modus, setModus] = useState<Modus>('print');
  const [materialId, setMaterialId] = useState(
    forhandsvalgtMaterial && materials.some((m) => m.id === forhandsvalgtMaterial)
      ? forhandsvalgtMaterial
      : (materials[0]?.id ?? '')
  );
  const [fargeId, setFargeId] = useState(colors[0]?.id ?? '');
  const [vektModus, setVektModus] = useState<'range' | 'exact'>('range');
  const [rangeId, setRangeId] = useState(
    forhandsvalgtStorrelse && weightRanges.some((w) => w.id === forhandsvalgtStorrelse)
      ? forhandsvalgtStorrelse
      : (weightRanges[1]?.id ?? weightRanges[0]?.id ?? '')
  );
  const [gram, setGram] = useState('60');
  const [antall, setAntall] = useState(1);
  const [valgteExtras, setValgteExtras] = useState<string[]>([]);
  const [beskrivelse, setBeskrivelse] = useState(forhandsvalgtTekst ?? '');
  const [reparasjon, setReparasjon] = useState('');
  const [kvittering, setKvittering] = useState('');
  const harForhandsvalg = !!(forhandsvalgtTekst || forhandsvalgtMaterial || forhandsvalgtStorrelse);
  const [stegApent, setStegApent] = useState<Record<number, boolean>>({
    1: harForhandsvalg,
    2: true,
    3: true,
  });

  function veksle(nummer: number) {
    setStegApent((prev) => ({ ...prev, [nummer]: !prev[nummer] }));
  }

  /* ---------------- Levering og kontakt ---------------- */
  const [leveringId, setLeveringId] = useState(deliveryOptions[0]?.id ?? '');
  const [navn, setNavn] = useState('');
  const [adresse, setAdresse] = useState('');
  const [tlf, setTlf] = useState('');
  const [epost, setEpost] = useState('');
  const [betaling, setBetaling] = useState('Vipps');
  const [sender, setSender] = useState(false);
  const [sendeFeil, setSendeFeil] = useState('');
  const [kommentar, setKommentar] = useState('');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FORM_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.navn) setNavn(d.navn);
        if (d.adresse) setAdresse(d.adresse);
        if (d.tlf) setTlf(d.tlf);
        if (d.epost) setEpost(d.epost);
        if (d.betaling) setBetaling(d.betaling);
      }
    } catch {
      /* ikke kritisk */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        FORM_KEY,
        JSON.stringify({ navn, adresse, tlf, epost, betaling })
      );
    } catch {
      /* ikke kritisk */
    }
  }, [navn, adresse, tlf, epost, betaling]);

  const material = materials.find((m) => m.id === materialId) ?? materials[0];
  const farge = colors.find((c) => c.id === fargeId) ?? colors[0];
  const range = weightRanges.find((w) => w.id === rangeId) ?? weightRanges[0];
  const perGram = material?.price_per_gram ?? 0;

  const { minG, maxG } = useMemo(() => {
    if (vektModus === 'exact') {
      const g = Math.max(1, Math.min(5000, Number(gram.replace(',', '.')) || 0));
      return { minG: g, maxG: g };
    }
    return { minG: range?.min_g ?? 0, maxG: range?.max_g ?? 10 };
  }, [vektModus, gram, range]);

  const valgteExtraObjekter: SelectedExtra[] = useMemo(
    () =>
      extras
        .filter((e) => valgteExtras.includes(e.id))
        .map((e) => ({ id: e.id, name: e.name, price: Number(e.price), scope: e.scope })),
    [extras, valgteExtras]
  );

  const perItemExtras = valgteExtraObjekter
    .filter((e) => e.scope === 'item')
    .reduce((sum, e) => sum + e.price, 0);

  const linjeMin = (minG * perGram + perItemExtras) * antall;
  const linjeMaks = (maxG * perGram + perItemExtras) * antall;

  const levering = deliveryOptions.find((d) => d.id === leveringId) ?? deliveryOptions[0];
  const leveringPris = Number(levering?.price ?? 0);
  const krevAdresse = leveringPris > 0;

  const totals = useMemo(
    () => orderTotals(items, { startFee: useStartFee ? startFee : 0, deliveryFee: leveringPris }),
    [items, startFee, useStartFee, leveringPris]
  );

  const manglerNavn = navn.trim().split(/\s+/).filter(Boolean).length < 2;
  const manglerTlf = tlf.replace(/\D/g, '').length < 8;
  const manglerEpost = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(epost.trim());
  const manglerAdresse = krevAdresse && !adresse.trim();
  const klar =
    items.length > 0 && !manglerNavn && !manglerTlf && !manglerEpost && !manglerAdresse;

  const mangeltekst = manglerNavn
    ? 'Skriv hele navnet ditt i steg 3.'
    : manglerTlf
      ? 'Skriv mobilnummeret ditt i steg 3.'
      : manglerEpost
        ? 'Skriv e-postadressen din i steg 3.'
        : 'Skriv adressen i steg 3.';

  function toggleExtra(id: string) {
    setValgteExtras((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function kvitter(tekst: string) {
    setKvittering(tekst);
    window.setTimeout(() => setKvittering(''), 2600);
  }

  function leggTil() {
    if (modus === 'reparasjon') {
      if (!reparasjon.trim()) return;
      add({ kind: 'repair', qty: 1, title: 'Reparasjon', description: reparasjon.trim() });
      setReparasjon('');
      kvitter('Reparasjonen er lagt til');
      setStegApent((prev) => ({ ...prev, 1: false }));
      return;
    }
    if (!material) return;
    add({
      kind: 'print',
      qty: antall,
      title: `3D-print i ${material.name}`,
      materialId: material.id,
      materialName: material.name,
      colorName: farge?.name,
      pricePerGram: perGram,
      weightMode: vektModus,
      rangeLabel: vektModus === 'range' ? range?.label : undefined,
      minG,
      maxG,
      extras: valgteExtraObjekter,
      note: beskrivelse.trim() || undefined,
    });
    setBeskrivelse('');
    setAntall(1);
    setValgteExtras([]);
    kvitter('Lagt til i bestillingen');
    setStegApent((prev) => ({ ...prev, 1: false }));
  }

  async function sendBestilling() {
    if (!klar || sender) return;
    setSender(true);
    setSendeFeil('');

    const varer = items.map((item) => {
      const p = itemPrice(item);
      const produkt = item.kind === 'product' ? item : null;
      return {
        navn:
          item.kind === 'product'
            ? item.title
            : item.kind === 'repair'
              ? `Reparasjon: ${item.description}`
              : beskrivPrint(item),
        antall: item.qty,
        pris: p.unknown
          ? 'Etter avtale'
          : p.min === p.max
            ? `${Math.round(p.min)} ${currency}`
            : `${Math.round(p.min)}–${Math.round(p.max)} ${currency}`,
        prisMin: p.unknown ? 0 : p.min,
        prisMaks: p.unknown ? 0 : p.max,
        produktId: produkt?.productId ?? null,
        kode: produkt?.code ?? '',
        type: item.kind === 'product' ? 'galleri' : 'egen',
      };
    });

    const sumTekst = totals.hasUnknown
      ? 'Etter avtale'
      : totals.isRange
        ? `${Math.round(totals.totalMin)}–${Math.round(totals.totalMax)} ${currency}`
        : `${Math.round(totals.totalMin)} ${currency}`;

    try {
      const res = await fetch('/api/bestilling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          navn: navn.trim(),
          telefon: tlf.trim(),
          epost: epost.trim(),
          adresse: adresse.trim(),
          levering: levering?.name ?? 'Henting',
          betaling,
          kommentar: kommentar.trim(),
          varer,
          sum: sumTekst,
          sumMin: totals.hasUnknown ? 0 : totals.totalMin,
          sumMaks: totals.hasUnknown ? 0 : totals.totalMax,
        }),
      });

      const svar = await res.json().catch(() => ({}));
      if (!res.ok || !svar?.ok) {
        setSendeFeil(svar?.feil || 'Klarte ikke å sende bestillingen. Prøv igjen.');
        setSender(false);
        return;
      }

      try {
        window.sessionStorage.setItem(
          'printfikseb_kvittering',
          JSON.stringify({
            ordrenr: svar.ordrenr,
            navn: navn.trim(),
            telefon: tlf.trim(),
            epost: epost.trim(),
            adresse: adresse.trim(),
            levering: levering?.name ?? 'Henting',
            betaling,
            kommentar: kommentar.trim(),
            varer,
            sum: sumTekst,
            epostSendt: Boolean(svar.epostSendt),
          })
        );
      } catch {
        /* ikke kritisk */
      }

      clear();
      router.push('/bestilt');
    } catch {
      setSendeFeil('Fikk ikke kontakt med oss akkurat nå. Prøv igjen om litt.');
      setSender(false);
    }
  }

  const kanLeggeTil = modus === 'reparasjon' ? !!reparasjon.trim() : true;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-start">
      {/* ===================== VENSTRE: valgene ===================== */}
      <div className="space-y-4">
        {/* ---- 1. Hva skal vi lage ---- */}
        <Steg
          nummer={1}
          tittel="Hva skal vi lage?"
          undertittel="3D-print eller reparasjon – trykk for å velge"
          apen={stegApent[1]}
          onToggle={() => veksle(1)}
          fremhevet
        >
          <div className="inline-flex rounded-full border border-ink-200 bg-white p-1">
            {(
              [
                { id: 'print', label: '3D-print' },
                { id: 'reparasjon', label: 'Reparasjon' },
              ] as { id: Modus; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setModus(t.id)}
                className={`relative rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                  modus === t.id ? 'text-white' : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                {modus === t.id && (
                  <motion.span
                    layoutId="bestilling-tab"
                    className="absolute inset-0 rounded-full bg-brand-600"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative">{t.label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {modus === 'print' ? (
              <motion.div
                key="print"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="mt-5 space-y-6"
              >
                <div>
                  <label className="label" htmlFor="hva">
                    Beskriv hva du vil ha
                  </label>
                  <textarea
                    id="hva"
                    rows={3}
                    value={beskrivelse}
                    onChange={(e) => setBeskrivelse(e.target.value)}
                    placeholder="F.eks. «En holder til saksene på pulten, ca. 12 cm høy» eller «Jeg har en STL-fil jeg kan sende»"
                    className="field resize-none"
                  />
                </div>

                <div>
                  <span className="label">Materiale</span>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {materials.map((m) => (
                      <Valg
                        key={m.id}
                        valgt={m.id === materialId}
                        onClick={() => setMaterialId(m.id)}
                        tittel={m.name}
                        hoyre={`${m.price_per_gram.toLocaleString('nb-NO', {
                          minimumFractionDigits: 2,
                        })} ${currency}/g`}
                        under={m.description ?? ''}
                      />
                    ))}
                  </div>
                </div>

                {colors.length > 0 && (
                  <div>
                    <span className="label">Farge</span>
                    <div className="flex flex-wrap gap-2.5">
                      {colors.map((c) => {
                        const valgt = c.id === (farge?.id ?? '');
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setFargeId(c.id)}
                            className={`flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                              valgt
                                ? 'border-brand-500 bg-brand-50 text-brand-700 ring-4 ring-brand-100'
                                : 'border-ink-200 bg-white text-ink-700 hover:border-brand-300'
                            }`}
                          >
                            <span
                              className="h-5 w-5 rounded-full border border-ink-200"
                              style={{ background: c.hex }}
                              aria-hidden
                            />
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                    <p className="hint">
                      Vil du ha en annen farge? Skriv det i kommentaren, så sjekker vi om vi har
                      den.
                    </p>
                  </div>
                )}

                <div>
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
                    <span className="label mb-0">Hvor stor er den?</span>
                    <div className="inline-flex rounded-full bg-ink-50 p-1 text-[13px]">
                      {(
                        [
                          { id: 'range', label: 'Omtrent' },
                          { id: 'exact', label: 'Jeg vet vekten' },
                        ] as { id: 'range' | 'exact'; label: string }[]
                      ).map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setVektModus(o.id)}
                          className={`rounded-full px-3.5 py-1.5 font-semibold transition-colors ${
                            vektModus === o.id
                              ? 'bg-white text-ink-900 shadow-sm'
                              : 'text-ink-500 hover:text-ink-800'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {vektModus === 'range' ? (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {weightRanges.map((w) => (
                        <Valg
                          key={w.id}
                          valgt={w.id === rangeId}
                          onClick={() => setRangeId(w.id)}
                          tittel={w.label}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="max-w-xs">
                      <input
                        type="number"
                        min={1}
                        max={5000}
                        value={gram}
                        onChange={(e) => setGram(e.target.value)}
                        className="field"
                        aria-label="Vekt i gram"
                      />
                      <p className="hint">Vekten i gram, slik slicer-programmet viser den.</p>
                    </div>
                  )}
                </div>

                <div>
                  <span className="label">Trenger du noe mer?</span>
                  <div className="space-y-2.5">
                    {extras.map((e) => (
                      <Avkryssing
                        key={e.id}
                        valgt={valgteExtras.includes(e.id)}
                        onClick={() => toggleExtra(e.id)}
                        tittel={e.name}
                        pris={`+${Math.round(Number(e.price))} ${currency}${
                          e.scope === 'item' && antall > 1 ? ' pr. stk' : ''
                        }`}
                        under={e.description ?? ''}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-ink-700">Antall</span>
                  <Teller verdi={antall} onEndre={setAntall} />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="reparasjon"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="mt-5"
              >
                <p className="text-sm leading-relaxed text-ink-600">{repairText}</p>
                <div className="mt-4">
                  <label className="label" htmlFor="reparasjon">
                    Hva er ødelagt?
                  </label>
                  <textarea
                    id="reparasjon"
                    rows={4}
                    value={reparasjon}
                    onChange={(e) => setReparasjon(e.target.value)}
                    placeholder="F.eks. «Håndtaket på oppvaskmaskinkurven har knekt. Det er ca. 6 cm langt.»"
                    className="field resize-none"
                  />
                  <p className="hint">
                    Har du bilde eller mål? Send det på melding når vi tar kontakt.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Steg>

        {/* ---- 2. Levering ---- */}
        <Steg
          nummer={2}
          tittel="Hvordan vil du ha det?"
          undertittel="Henting eller hjemlevering"
          apen={stegApent[2]}
          onToggle={() => veksle(2)}
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            {deliveryOptions.map((d) => (
              <Valg
                key={d.id}
                valgt={d.id === leveringId}
                onClick={() => setLeveringId(d.id)}
                tittel={d.name}
                hoyre={
                  Number(d.price) === 0 ? 'Gratis' : `${Math.round(Number(d.price))} ${currency}`
                }
                under={d.description ?? ''}
                gronn={Number(d.price) === 0}
              />
            ))}
          </div>
          <p className="hint">
            Hjemlevering gjelder innenfor {radiusKm} km. Bor du litt lenger unna? Skriv det i
            kommentaren, så finner vi ut av det.
          </p>
        </Steg>

        {/* ---- 3. Om deg ---- */}
        <Steg
          nummer={3}
          tittel="Hvem er du?"
          undertittel="Navn, adresse og betaling"
          apen={stegApent[3]}
          onToggle={() => veksle(3)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="navn">
                Fullt navn <span className="text-red-500">*</span>
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
                Mobilnummer <span className="text-red-500">*</span>
              </label>
              <input
                id="tlf"
                value={tlf}
                onChange={(e) => setTlf(e.target.value)}
                placeholder="412 34 567"
                className="field"
                inputMode="tel"
                autoComplete="tel"
              />
              <p className="hint">Vi ringer eller sender melding for å avtale detaljene.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="epost">
                E-post <span className="text-red-500">*</span>
              </label>
              <input
                id="epost"
                type="email"
                value={epost}
                onChange={(e) => setEpost(e.target.value)}
                placeholder="ola@example.com"
                className="field"
                autoComplete="email"
              />
              <p className="hint">Hit sender vi kvitteringen med det du har bestilt.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="adresse">
                Adresse {krevAdresse && <span className="text-red-500">*</span>}
              </label>
              <input
                id="adresse"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder="Vestre Sandslimarka 44"
                className="field"
                autoComplete="street-address"
              />
            </div>
            <div className="sm:col-span-2">
              <span className="label">Betaling</span>
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
                  : 'Si fra på forhånd, så har vi veksel klart.'}
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="kommentar">
                Noe mer vi bør vite?
              </label>
              <textarea
                id="kommentar"
                rows={2}
                value={kommentar}
                onChange={(e) => setKommentar(e.target.value)}
                placeholder="F.eks. ønsket farge, eller når du trenger det."
                className="field resize-none"
              />
            </div>
          </div>
        </Steg>
      </div>

      {/* ===================== HØYRE: kalkulator + bestilling ===================== */}
      <div className="space-y-4 lg:sticky lg:top-20">
        {/* --- Kalkulatoren: står ved siden av valgene --- */}
        <AnimatePresence initial={false}>
          {stegApent[1] && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
        <div className="overflow-hidden rounded-3xl border border-brand-200 bg-white shadow-soft">
          <div className="border-b border-brand-100 bg-brand-50/70 px-5 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-700">
              Prisen på det du velger nå
            </p>
          </div>
          <div className="px-5 py-4">
            {modus === 'reparasjon' ? (
              <p className="text-2xl font-bold text-ink-900">{repairPriceText}</p>
            ) : (
              <>
                <p className="text-3xl font-bold leading-none text-ink-900">
                  {Math.round(linjeMin) === Math.round(linjeMaks) ? (
                    <AnimatedNumber value={linjeMin} />
                  ) : (
                    <>
                      <AnimatedNumber value={linjeMin} />
                      <span className="mx-1 text-ink-300">–</span>
                      <AnimatedNumber value={linjeMaks} />
                    </>
                  )}
                  <span className="ml-1.5 text-base font-semibold text-ink-400">{currency}</span>
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
                  {material?.name}
                  {farge ? ` · ${farge.name.toLowerCase()}` : ''} ·{' '}
                  {minG === maxG ? `${maxG} g` : `${minG}–${maxG} g`}
                  {antall > 1 ? ` · ${antall} stk` : ''}
                  {valgteExtraObjekter.length
                    ? ` · ${valgteExtraObjekter.map((e) => e.name).join(', ')}`
                    : ''}
                </p>
              </>
            )}

            <button
              type="button"
              onClick={leggTil}
              disabled={!kanLeggeTil}
              className="btn-primary mt-4 w-full"
            >
              + Legg til i bestillingen
            </button>

            <AnimatePresence>
              {kvittering && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden pt-2.5 text-center text-sm font-semibold text-emerald-600"
                >
                  {kvittering} ✓
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- Bestillingen --- */}
        <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-lift">
          <div className="relative overflow-hidden bg-ink-900 px-5 py-6 text-white">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(22rem 11rem at 15% 0%, rgba(61,118,241,0.45), transparent 62%)',
              }}
            />
            <div className="relative flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-300">
                  Bestillingen din
                </p>
                <p className="mt-1.5 text-3xl font-bold leading-none">
                  {items.length === 0 ? (
                    <span className="text-ink-400">0 {currency}</span>
                  ) : totals.isRange ? (
                    <>
                      <AnimatedNumber value={totals.totalMin} />
                      <span className="mx-1 text-ink-400">–</span>
                      <AnimatedNumber value={totals.totalMax} />
                      <span className="ml-1.5 text-base font-semibold text-ink-300">{currency}</span>
                    </>
                  ) : (
                    <>
                      <AnimatedNumber value={totals.totalMin} />
                      <span className="ml-1.5 text-base font-semibold text-ink-300">{currency}</span>
                    </>
                  )}
                </p>
              </div>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={clear}
                  className="shrink-0 text-xs font-semibold text-ink-400 transition-colors hover:text-white"
                >
                  Tøm
                </button>
              )}
            </div>
          </div>

          {!ready ? (
            <div className="h-24 animate-pulse bg-ink-50" />
          ) : items.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="text-sm leading-relaxed text-ink-500">
                Ingenting lagt til ennå.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {!stegApent[1] && (
                  <button
                    type="button"
                    onClick={() => setStegApent((prev) => ({ ...prev, 1: true }))}
                    className="btn-soft btn-sm"
                  >
                    + Legg til noe
                  </button>
                )}
                <Link href="/galleri" className="btn-ghost btn-sm">
                  Se ferdige modeller
                </Link>
              </div>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-ink-100 px-5">
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

              <dl className="space-y-1.5 border-t border-ink-100 px-5 py-4 text-sm">
                {totals.extras.map((e) => (
                  <Rad key={e.id} navn={e.name} verdi={`${Math.round(e.price)} ${currency}`} />
                ))}
                {totals.startFee > 0 && (
                  <Rad
                    navn="Startpris (én gang)"
                    verdi={`${Math.round(totals.startFee)} ${currency}`}
                  />
                )}
                <Rad
                  navn={levering?.name ?? 'Levering'}
                  verdi={leveringPris === 0 ? 'Gratis' : `${Math.round(leveringPris)} ${currency}`}
                />
                {totals.hasUnknown && <Rad navn="Reparasjon" verdi="Etter avtale" tone="muted" />}
              </dl>
            </>
          )}

          <div className="border-t border-ink-100 bg-ink-50/60 p-5">
            {items.length > 0 && !klar && (
              <p className="mb-3 rounded-2xl bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-700">
                {mangeltekst}
              </p>
            )}

            {sendeFeil && (
              <p className="mb-3 rounded-2xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700">
                {sendeFeil}
              </p>
            )}

            <button
              type="button"
              onClick={sendBestilling}
              disabled={!klar || sender}
              className={`btn-primary w-full ${klar && !sender ? '' : 'opacity-50'}`}
            >
              {sender ? (
                'Sender bestillingen …'
              ) : (
                <>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M4 12.5 9.5 18 20 6.5"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Send bestilling
                </>
              )}
            </button>

            <div className="mt-2.5">
              <a href={telHref(phone)} className="btn-ghost w-full">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M6.5 3.5h3l1.5 4-2 1.4a12 12 0 0 0 6.1 6.1l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                </svg>
                Ring i stedet
              </a>
            </div>

            <div className="mt-4 space-y-1.5 text-[11px] leading-relaxed text-ink-500">
              <p>
                <span className="font-bold text-brand-600">24/7</span> {messageHours}
              </p>
              <p>
                <span className="font-bold text-brand-600">Telefon</span> {phoneHours}{' '}
                {callbackText}
              </p>
              <p className="pt-1">
                Vi tar kontakt så fort vi kan for å avtale detaljene. {approvalText}
              </p>
            </div>


          </div>
        </div>

        <p className="px-2 text-center text-xs leading-relaxed text-ink-400">
          Ferdig på {daysMin}–{daysMax} virkedager etter at du har godkjent prisen. {paymentText}
        </p>
      </div>
    </div>
  );
}

/* ------------------------- Små byggeklosser ------------------------- */

function Steg({
  nummer,
  tittel,
  undertittel,
  apen,
  onToggle,
  fremhevet,
  children,
}: {
  nummer: number;
  tittel: string;
  undertittel?: string;
  apen: boolean;
  onToggle: () => void;
  fremhevet?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`overflow-hidden rounded-3xl border bg-white shadow-soft transition-colors ${
        fremhevet && !apen ? 'border-brand-300' : 'border-ink-100'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={apen}
        className={`flex w-full items-center gap-3 px-5 py-4 text-left transition-colors sm:px-6 ${
          fremhevet && !apen ? 'bg-brand-50/70 hover:bg-brand-50' : 'hover:bg-ink-50/60'
        }`}
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
            fremhevet && !apen ? 'bg-brand-600' : 'bg-ink-900'
          }`}
        >
          {nummer}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-ink-900">{tittel}</span>
          {undertittel && !apen && (
            <span className="mt-0.5 block truncate text-[13px] text-ink-500">{undertittel}</span>
          )}
        </span>
        <motion.span
          animate={{ rotate: apen ? 180 : 0 }}
          className={`shrink-0 ${fremhevet && !apen ? 'text-brand-700' : 'text-ink-400'}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {apen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-ink-100 px-5 py-5 sm:px-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Valg({
  valgt,
  onClick,
  tittel,
  hoyre,
  under,
  gronn,
}: {
  valgt: boolean;
  onClick: () => void;
  tittel: string;
  hoyre?: string;
  under?: string;
  gronn?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
        valgt
          ? 'border-brand-500 bg-brand-50 ring-4 ring-brand-100'
          : 'border-ink-200 bg-white hover:border-brand-300'
      }`}
    >
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-ink-900">{tittel}</span>
        {hoyre && (
          <span
            className={`shrink-0 text-sm font-bold ${gronn ? 'text-emerald-600' : 'text-brand-700'}`}
          >
            {hoyre}
          </span>
        )}
      </span>
      {under && <span className="mt-1 block text-xs leading-relaxed text-ink-500">{under}</span>}
    </button>
  );
}

function Avkryssing({
  valgt,
  onClick,
  tittel,
  pris,
  under,
}: {
  valgt: boolean;
  onClick: () => void;
  tittel: string;
  pris: string;
  under?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 ${
        valgt
          ? 'border-brand-500 bg-brand-50 ring-4 ring-brand-100'
          : 'border-ink-200 bg-white hover:border-brand-300'
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
          valgt ? 'border-brand-600 bg-brand-600' : 'border-ink-300 bg-white'
        }`}
      >
        {valgt && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 13l4 4L19 7"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-semibold text-ink-900">{tittel}</span>
          <span className="shrink-0 text-sm font-bold text-brand-700">{pris}</span>
        </span>
        {under && <span className="mt-1 block text-xs leading-relaxed text-ink-500">{under}</span>}
      </span>
    </button>
  );
}

function Teller({ verdi, onEndre }: { verdi: number; onEndre: (n: number) => void }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white p-1">
      <button
        type="button"
        onClick={() => onEndre(Math.max(1, verdi - 1))}
        className="h-8 w-8 rounded-full text-lg font-bold text-ink-600 transition-colors hover:bg-ink-50"
        aria-label="Færre"
      >
        −
      </button>
      <span className="w-8 text-center text-sm font-bold">{verdi}</span>
      <button
        type="button"
        onClick={() => onEndre(Math.min(99, verdi + 1))}
        className="h-8 w-8 rounded-full text-lg font-bold text-ink-600 transition-colors hover:bg-ink-50"
        aria-label="Flere"
      >
        +
      </button>
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
    <div className="flex gap-3 py-3.5">
      {bilde && (
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-brand-50">
          <Image src={bilde} alt="" fill sizes="48px" className="object-cover" />
        </div>
      )}
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
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-500">{undertekst}</p>
        )}
        <div className="mt-2 flex items-center gap-3">
          {item.kind !== 'repair' && (
            <div className="inline-flex items-center gap-0.5 rounded-full border border-ink-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => onQty(item.qty - 1)}
                className="h-6 w-6 rounded-full text-sm font-bold text-ink-500 hover:bg-ink-50"
                aria-label="Færre"
              >
                −
              </button>
              <span className="w-5 text-center text-xs font-bold">{item.qty}</span>
              <button
                type="button"
                onClick={() => onQty(item.qty + 1)}
                className="h-6 w-6 rounded-full text-sm font-bold text-ink-500 hover:bg-ink-50"
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
  const note = item.note ? ` · «${item.note}»` : '';
  const farge = item.colorName ? ` · ${item.colorName.toLowerCase()}` : '';
  return `${item.materialName}${farge} · ${vekt}${extras ? ` · ${extras}` : ''}${note}`;
}

function Rad({ navn, verdi, tone }: { navn: string; verdi: string; tone?: 'muted' }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={tone === 'muted' ? 'text-ink-400' : 'text-ink-600'}>{navn}</dt>
      <dd className={`shrink-0 font-semibold ${tone === 'muted' ? 'text-ink-400' : 'text-ink-900'}`}>
        {verdi}
      </dd>
    </div>
  );
}
