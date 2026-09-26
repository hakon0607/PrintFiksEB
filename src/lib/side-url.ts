/**
 * Adressen nettsiden ligger på.
 *
 * Brukes bare på serveren – til metadata, robots.txt, sitemap og
 * invitasjonslenker. Derfor heter variabelen SITE_URL og ikke
 * NEXT_PUBLIC_SITE_URL: uten «NEXT_PUBLIC» havner den aldri i
 * nettleseren, og Vercel slutter å advare om det.
 *
 * NEXT_PUBLIC_SITE_URL leses fortsatt som reserve, så ingenting
 * knekker før dere har byttet navn i Vercel.
 */
export const SIDE_URL =
  process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://printfiks.org';
