import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://printfiks.org';

export default function sitemap(): MetadataRoute.Sitemap {
  const na = new Date();
  return [
    { url: `${BASE}/`, lastModified: na, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/galleri`, lastModified: na, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/bestill`, lastModified: na, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/3d-printing`, lastModified: na, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/om-oss`, lastModified: na, changeFrequency: 'monthly', priority: 0.6 },
  ];
}
