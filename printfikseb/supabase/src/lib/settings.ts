export function num(settings: Record<string, string>, key: string, fallback = 0): number {
  const raw = settings[key];
  if (raw === undefined || raw === null || raw === '') return fallback;
  const n = Number(String(raw).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

export function bool(settings: Record<string, string>, key: string, fallback = true): boolean {
  const raw = (settings[key] ?? '').toString().trim().toLowerCase();
  if (!raw) return fallback;
  return ['ja', 'true', '1', 'på', 'pa', 'yes'].includes(raw);
}

export function text(settings: Record<string, string>, key: string, fallback = ''): string {
  const raw = settings[key];
  return raw === undefined || raw === null || raw === '' ? fallback : raw;
}

/** 1234.5 -> "1 235 kr" */
export function kr(value: number, currency = 'kr'): string {
  const rounded = Math.round(value);
  return `${rounded.toLocaleString('nb-NO').replace(/ /g, ' ')} ${currency}`;
}

/** Viser et prisintervall pent: 40–120 kr, eller bare 120 kr hvis likt. */
export function krRange(min: number, max: number, currency = 'kr'): string {
  const a = Math.round(min);
  const b = Math.round(max);
  if (a === b) return kr(a, currency);
  return `${a.toLocaleString('nb-NO').replace(/ /g, ' ')}–${b
    .toLocaleString('nb-NO')
    .replace(/ /g, ' ')} ${currency}`;
}

/** 41381608 -> 413 81 608 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 8) return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`;
  return phone;
}

export function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('47') ? `+${digits}` : `+47${digits}`;
}
