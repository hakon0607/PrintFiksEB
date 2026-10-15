import type { MetadataRoute } from 'next';
import { SIDE_URL as BASE } from '@/lib/side-url';
import { getSiteData } from '@/lib/data';

export const revalidate = 3600;

/** Alle sidene våre – også hver modell i galleriet, så søkemotorer og AI finner dem. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const na = new Date();
  const faste: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: na, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/galleri`, lastModified: na, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/om-oss`, lastModified: na, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/bestill`, lastModified: na, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/3d-printing`, lastModified: na, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/llms.txt`, lastModified: na, changeFrequency: 'weekly', priority: 0.3 },
  ];
  try {
    const site = await getSiteData();
    const modeller: MetadataRoute.Sitemap = site.products
      .filter((p) => p.code)
      .map((p) => ({
        url: `${BASE}/galleri/${encodeURIComponent(p.code!)}`,
        lastModified: p.created_at ? new Date(p.created_at) : na,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
        images: [p.image_url, ...(p.images ?? [])]
          .filter((b): b is string => Boolean(b))
          .slice(0, 5)
          .map((b) => (/^https?:\/\//.test(b) ? b : `${BASE}${b.startsWith('/') ? '' : '/'}${b}`)),
      }));
    const studioer: MetadataRoute.Sitemap = site.products
      .filter((p) => p.spesial === 'deksel' || p.spesial === 'pepperkake')
      .map((p) => ({ url: `${BASE}/galleri/${p.code}/lag`, lastModified: na, changeFrequency: 'monthly' as const, priority: 0.6 }));
    return [...faste, ...modeller, ...studioer];
  } catch {
    return faste;
  }
}
