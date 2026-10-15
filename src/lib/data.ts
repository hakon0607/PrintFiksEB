import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getPublicServerClient } from './supabase/server';
import { DEFAULT_SITE, DEFAULT_SETTINGS } from './defaults';
import { dekselFraPris, erDekselProdukt } from './deksel/produkt';
import { erPepperkakeProdukt, oppsettFra, pepperkakeFraPris } from './pepperkake/pris';
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
  Color,
  Review,
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

const PRODUKTFELT =
  'id,code,name,description,details,tagline,highlights,price,image_url,images,material,weight_g,category,featured,active,sort,created_at';

/** Nyere kolonner – finnes bare når SQL-en for dem er kjørt. */
const EKSTRA_FELT = {
  versjoner: 'variants',
  designMerke: 'design_din_egen',
  tre: 'modell_3d,vis_3d,modell_3d_farge',
};

/**
 * Modellene, med alle nyere felt (versjoner, «Design din egen!», 3D-fil).
 * Er SQL-en for et av dem ikke kjørt ennå, finnes ikke kolonnen – da prøver vi
 * uten den, så galleriet aldri blir tomt.
 */
async function hentProdukter(sb: NonNullable<ReturnType<typeof getPublicServerClient>>): Promise<Product[]> {
  const sporring = (felt: string) =>
    sb
      .from('products')
      .select(felt)
      .eq('active', true)
      .order('sort')
      .order('created_at', { ascending: false });
  const { versjoner, designMerke, tre } = EKSTRA_FELT;
  const forsok = [
    [versjoner, designMerke, tre],
    [versjoner, tre],
    [versjoner, designMerke],
    [versjoner],
    [],
  ];
  for (const ekstra of forsok) {
    try {
      const r = await sporring([PRODUKTFELT, ...ekstra].join(','));
      if (!r.error && r.data) return r.data as unknown as Product[];
    } catch {
      /* prøv neste */
    }
  }
  return [];
}

/** Navnet på hurtigbufferen som tømmes når dere trykker «Publiser» i /admin. */
export const SITE_TAG = 'printfikseb-innhold';

/** Henter alt innhold til nettsiden. Faller tilbake til standardverdier hvis databasen ikke svarer. */
async function hentAlt(): Promise<SiteData> {
  const sb = getPublicServerClient();
  if (!sb) return DEFAULT_SITE;

  try {
    const [
      settingsRes,
      materials,
      weightRanges,
      extras,
      deliveryOptions,
      products,
      team,
      faq,
      examples,
      colors,
      reviews,
    ] =
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
        hentProdukter(sb),
        safe<TeamMember>(
          sb.from('team_members').select('*').eq('show_on_site', true).order('sort') as never,
          []
        ),
        safe<Faq>(sb.from('faq').select('*').eq('active', true).order('sort') as never, DEFAULT_SITE.faq),
        safe<Example>(
          sb.from('examples').select('*').eq('active', true).order('sort') as never,
          DEFAULT_SITE.examples
        ),
        safe<Color>(
          sb.from('colors').select('*').eq('active', true).order('sort') as never,
          DEFAULT_SITE.colors
        ),
        safe<Review>(
          sb
            .from('reviews')
            .select('*')
            .eq('active', true)
            .order('sort')
            .order('created_at', { ascending: false }) as never,
          []
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
      products: products.map(normalizeNumbers('price')).map((p) =>
        // dekselproduktet: prisen kommer fra dekselprisene, og kortet lenker til generatoren
        erDekselProdukt(p)
          ? {
              ...p,
              spesial: 'deksel' as const,
              price: dekselFraPris(
                Number(settings.deksel_grunnpris ?? 59) || 59,
                Number(settings.deksel_pris_per_farge ?? 10) || 0
              ),
            }
          : erPepperkakeProdukt(p)
            ? {
                // pepperkakeformen: prisen regnes etter lengden av streken (Admin → Priser),
                // kortet viser «fra»-prisen
                ...p,
                spesial: 'pepperkake' as const,
                price: pepperkakeFraPris(oppsettFra(settings)),
              }
            : p
      ),
      team,
      faq,
      examples,
      colors,
      reviews,
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
