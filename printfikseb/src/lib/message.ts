import type { CartItem, PrintItem, ProductItem, RepairItem } from './cart';
import { itemPrice, orderTotals } from './pricing';

export type OrderForm = {
  name: string;
  address: string;
  phone: string;
  deliveryName: string;
  deliveryPrice: number;
  payment: string;
  comment: string;
};

function nok(value: number, currency = 'kr') {
  return `${Math.round(value)} ${currency}`;
}

function span(min: number, max: number, currency = 'kr') {
  const a = Math.round(min);
  const b = Math.round(max);
  return a === b ? `${a} ${currency}` : `${a}-${b} ${currency}`;
}

/**
 * Bygger en ferdig melding kunden bare kan sende til oss.
 * Vi holder oss til vanlige tegn (ingen tankestrek eller hermetegn)
 * slik at SMS-en ikke blir delt opp i unødig mange meldinger.
 */
export function buildOrderMessage(
  items: CartItem[],
  form: OrderForm,
  opts: { startFee: number; businessName: string; currency?: string }
): string {
  const currency = opts.currency || 'kr';
  const totals = orderTotals(items, { startFee: opts.startFee, deliveryFee: form.deliveryPrice });

  const lines: string[] = [];
  lines.push(`Hei! Jeg vil gjerne bestille fra ${opts.businessName}.`);
  lines.push('');

  if (form.name.trim()) lines.push(`Navn: ${form.name.trim()}`);
  if (form.address.trim()) lines.push(`Adresse: ${form.address.trim()}`);
  if (form.deliveryName) {
    lines.push(
      `Levering: ${form.deliveryName}${form.deliveryPrice > 0 ? ` (${nok(form.deliveryPrice, currency)})` : ' (gratis)'}`
    );
  }
  if (form.payment) lines.push(`Betaling: ${form.payment}`);
  lines.push('');
  lines.push('Jeg vil ha:');

  for (const item of items) {
    if (item.kind === 'product') {
      const p = item as ProductItem;
      const price = itemPrice(p);
      lines.push(`- ${p.qty}x ${p.title} (ID ${p.code}) - ${nok(price.min, currency)}`);
      if (p.note?.trim()) lines.push(`  Merknad: ${p.note.trim()}`);
    } else if (item.kind === 'repair') {
      const r = item as RepairItem;
      lines.push(`- Reparasjon: ${r.description || 'se beskrivelse under'}`);
      lines.push('  Pris: etter avtale');
    } else {
      const p = item as PrintItem;
      const price = itemPrice(p);
      const vekt =
        p.weightMode === 'exact' ? `ca. ${p.maxG} g` : `ca. ${p.minG}-${p.maxG} g`;
      lines.push(
        `- ${p.qty}x 3D-print i ${p.materialName}, ${vekt} - ${span(price.min, price.max, currency)}`
      );
      for (const extra of p.extras.filter((e) => e.scope === 'item')) {
        lines.push(
          `  + ${extra.name} (${nok(extra.price, currency)}${p.qty > 1 ? ' per stk' : ''}, allerede med i prisen over)`
        );
      }
      if (p.note?.trim()) lines.push(`  Det jeg vil ha laget: ${p.note.trim()}`);
    }
  }

  if (totals.extras.length || totals.startFee > 0) {
    lines.push('');
    for (const extra of totals.extras) {
      lines.push(`Tillegg: ${extra.name} (${nok(extra.price, currency)})`);
    }
    if (totals.startFee > 0) {
      lines.push(`Startpris: ${nok(totals.startFee, currency)}`);
    }
  }

  lines.push('');
  lines.push(
    `Estimert total: ${totals.isRange ? 'ca. ' : ''}${span(totals.totalMin, totals.totalMax, currency)}`
  );
  if (totals.hasUnknown) {
    lines.push('(Reparasjon kommer i tillegg, pris etter avtale.)');
  }

  if (form.comment.trim()) {
    lines.push('');
    lines.push(`Kommentar: ${form.comment.trim()}`);
  }

  lines.push('');
  lines.push('Prisen over er et estimat fra nettsiden. Send meg gjerne endelig pris, så godkjenner jeg før dere starter.');

  return lines.join('\n');
}

/** sms:-lenke som fungerer både på iPhone og Android. */
export function smsHref(phone: string, body: string): string {
  const digits = phone.replace(/\D/g, '');
  const nummer = digits.startsWith('47') ? `+${digits}` : `+47${digits}`;
  return `sms:${nummer}?&body=${encodeURIComponent(body)}`;
}
