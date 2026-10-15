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
 *
 * printfiks.org sender alle videre til www.printfiks.org. Google vil ha
 * den adressen sidene faktisk ligger på, så vi bruker alltid www – også
 * om SITE_URL i Vercel står uten.
 */
const raa = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.printfiks.org').trim().replace(/\/+$/, '');

export const SIDE_URL = raa.replace(/^https?:\/\/printfiks\.org$/i, 'https://www.printfiks.org');
