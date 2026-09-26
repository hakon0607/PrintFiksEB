import type { MetadataRoute } from 'next';

import { SIDE_URL as BASE } from '@/lib/side-url';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api'] }],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
