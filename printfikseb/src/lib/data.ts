import { cache } from 'react';
import { unstable_cache } from 'next/cache';
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
  Example,
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

/** Navnet på hurtigbufferen som tømmes når dere trykker «Publiser» i /admin. */
export const SITE_TAG = 'printfikseb-innhold';

/** Henter alt innhold til nettsiden. Faller tilbake til standardverdier hvis databasen ikke svarer. */
async function hentAlt(): Promise<SiteData> {
  const sb = getPublicServerClient();
  if (!sb) return DEFAULT_SITE;

  try {
    const [settingsRes, materials, weightRanges, extras, deliveryOptions, products, team, faq, examples] =
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
        safe<Example>(
          sb.from('examples').select('*').eq('active', true).order('sort') as never,
          DEFAULT_SITE.examples
        ),
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
      examples,
      connected,
    };
  } catch {
    return DEFAULT_SITE;
  }
}

/**
 * Den publiserte versjonen. Innholdet ligger lagret til noen trykker «Publiser»
 * i adminpanelet – da tømmes denne og nettsiden henter alt på nytt.
 */
const hentPublisert = unstable_cache(hentAlt, ['printfikseb-site-data'], { tags: [SITE_TAG] });

/** Innholdet slik det ser ut på den publiserte nettsiden. */
export const getSiteData = cache(() => hentPublisert());

/** Innholdet slik det ser ut akkurat nå i databasen (brukes til forhåndsvisning). */
export const getSiteDataFresh = cache(() => hentAlt());

/** Velger publisert eller fersk versjon ut fra ?forhandsvis i adressen. */
export function getSiteFor(searchParams?: {
  [key: string]: string | string[] | undefined;
}): Promise<SiteData> {
  return searchParams?.forhandsvis ? getSiteDataFresh() : getSiteData();
}

function normalizeNumbers<T extends Record<string, unknown>>(field: keyof T & string) {
  return (row: T): T => ({ ...row, [field]: Number(row[field] ?? 0) });
}
