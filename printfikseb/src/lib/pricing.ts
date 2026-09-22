import type { CartItem, PrintItem, SelectedExtra } from './cart';

export type PriceSpan = { min: number; max: number; unknown?: boolean };

export function itemPrice(item: CartItem): PriceSpan {
  if (item.kind === 'product') {
    const p = item.price * item.qty;
    return { min: p, max: p };
  }
  if (item.kind === 'repair') {
    return { min: 0, max: 0, unknown: true };
  }

  const print = item as PrintItem;
  const perItemExtras = print.extras
    .filter((e) => e.scope === 'item')
    .reduce((sum, e) => sum + e.price, 0);

  const min = (print.minG * print.pricePerGram + perItemExtras) * print.qty;
  const max = (print.maxG * print.pricePerGram + perItemExtras) * print.qty;
  return { min, max };
}

/** Tillegg som kun skal legges på én gang per bestilling (f.eks. hjemmebesøk). */
export function orderExtras(items: CartItem[]): SelectedExtra[] {
  const seen = new Map<string, SelectedExtra>();
  for (const item of items) {
    if (item.kind !== 'print') continue;
    for (const extra of item.extras) {
      if (extra.scope === 'order' && !seen.has(extra.id)) seen.set(extra.id, extra);
    }
  }
  return [...seen.values()];
}

export type OrderTotals = {
  itemsMin: number;
  itemsMax: number;
  extras: SelectedExtra[];
  extrasSum: number;
  startFee: number;
  deliveryFee: number;
  totalMin: number;
  totalMax: number;
  hasUnknown: boolean;
  isRange: boolean;
};

export function orderTotals(
  items: CartItem[],
  opts: { startFee: number; deliveryFee: number }
): OrderTotals {
  let itemsMin = 0;
  let itemsMax = 0;
  let hasUnknown = false;

  for (const item of items) {
    const p = itemPrice(item);
    if (p.unknown) {
      hasUnknown = true;
      continue;
    }
    itemsMin += p.min;
    itemsMax += p.max;
  }

  const extras = orderExtras(items);
  const extrasSum = extras.reduce((sum, e) => sum + e.price, 0);

  // Startprisen gjelder bare når vi skal lage noe.
  // Ferdige modeller fra galleriet har fast pris og får ingen startpris.
  const kreverStartpris = items.some((i) => i.kind !== 'product');
  const startFee = kreverStartpris ? opts.startFee : 0;
  const deliveryFee = opts.deliveryFee;

  const totalMin = itemsMin + extrasSum + startFee + deliveryFee;
  const totalMax = itemsMax + extrasSum + startFee + deliveryFee;

  return {
    itemsMin,
    itemsMax,
    extras,
    extrasSum,
    startFee,
    deliveryFee,
    totalMin,
    totalMax,
    hasUnknown,
    isRange: Math.round(totalMin) !== Math.round(totalMax),
  };
}
