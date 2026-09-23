import { cache } from 'react';
import { getPublicServerClient } from './supabase/server';
import { DEFAULT_SITE, DEFAULT_SETTINGS } from './defaults';
import type {
  SiteData,
  Material,
  WeightRange,
  Extra,
  DeliveryOption,
  Product,
  TeamMember,
  Faq,
} from './types';

async function safe<T>(promise: PromiseLike<{ data: T[] | null; error: unknown }>, fallback: T[]) {
  try {
    const { data, error } = await promise;
    if (error || !data) return fallback;
    return data.length ? data : fallback;
  } catch {
    return fallback;
  }
}

/** Henter alt innhold til nettsiden. Faller tilbake til standardverdier hvis databasen ikke svarer. */
export const getSiteData = cache(async function getSiteData(): Promise<SiteData> {
  const sb = getPublicServerClient();
  if (!sb) return DEFAULT_SITE;

  try {
    const [settingsRes, materials, weightRanges, extras, deliveryOptions, products, team, faq] =
      await Promise.all([
        sb.from('settings').select('key,value').then((r) => r),
        safe<Material>(
          sb.from('materials').select('*').eq('active', true).order('sort') as never,
          DEFAULT_SITE.materials
        ),
        safe<WeightRange>(
          sb.from('weight_ranges').select('*').eq('active', true).order('sort') as never,
          DEFAULT_SITE.weightRanges
        ),
        safe<Extra>(
          sb.from('extras').select('*').eq('active', true).order('sort') as never,
          DEFAULT_SITE.extras
        ),
        safe<DeliveryOption>(
          sb.from('delivery_options').select('*').eq('active', true).order('sort') as never,
          DEFAULT_SITE.deliveryOptions
        ),
        safe<Product>(
          sb
            .from('products')
            .select('*')
            .eq('active', true)
            .order('sort')
            .order('created_at', { ascending: false }) as never,
          []
        ),
        safe<TeamMember>(
          sb.from('team_members').select('*').eq('show_on_site', true).order('sort') as never,
          []
        ),
        safe<Faq>(sb.from('faq').select('*').eq('active', true).order('sort') as never, DEFAULT_SITE.faq),
      ]);

    const settings = { ...DEFAULT_SETTINGS };
    let connected = false;
    if (!settingsRes.error && settingsRes.data) {
      connected = true;
      for (const row of settingsRes.data as { key: string; value: string }[]) {
        if (row.value !== null && row.value !== undefined) settings[row.key] = row.value;
      }
    }

    return {
      settings,
      materials: materials.map(normalizeNumbers('price_per_gram')),
      weightRanges,
      extras: extras.map(normalizeNumbers('price')),
      deliveryOptions: deliveryOptions.map(normalizeNumbers('price')),
      products: products.map(normalizeNumbers('price')),
      team,
      faq,
      connected,
    };
  } catch {
    return DEFAULT_SITE;
  }
});

function normalizeNumbers<T extends Record<string, unknown>>(field: keyof T & string) {
  return (row: T): T => ({ ...row, [field]: Number(row[field] ?? 0) });
}
