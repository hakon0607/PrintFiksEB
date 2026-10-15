import type { MetadataRoute } from 'next';

import { SIDE_URL as BASE } from '@/lib/side-url';

/**
 * Alle søkemotorer og AI-er (ChatGPT, Gemini, Claude, Perplexity, Copilot …)
 * får lese hele nettsiden – bortsett fra adminpanelet og API-et.
 */
const AI_ROBOTER = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', // ChatGPT
  'Google-Extended', 'Googlebot', // Gemini og Google
  'Bingbot', // Bing og Copilot (ChatGPT-søk bruker også Bing)
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User', // Claude
  'PerplexityBot', 'Perplexity-User', // Perplexity
  'Applebot', 'Applebot-Extended', // Apple / Siri
  'meta-externalagent', // Meta AI
  'DuckAssistBot',
];

export default function robots(): MetadataRoute.Robots {
  const regel = { allow: '/', disallow: ['/admin', '/api'] };
  return {
    rules: [{ userAgent: '*', ...regel }, ...AI_ROBOTER.map((userAgent) => ({ userAgent, ...regel }))],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
