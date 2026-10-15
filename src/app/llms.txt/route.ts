/**
 * /llms.txt – et kort sammendrag av hele nettsiden, skrevet for AI-er
 * (ChatGPT, Gemini, Claude, Perplexity …). Bygges automatisk fra det som er
 * publisert i admin, så det alltid stemmer med nettsiden.
 */
import { getSiteData } from '@/lib/data';
import { formatPhone, text } from '@/lib/settings';
import { SIDE_URL } from '@/lib/side-url';
import { sosialeLenker } from '@/lib/strukturert';

export const revalidate = 3600;

const ren = (t: string | null | undefined) => String(t ?? '').replace(/\s+/g, ' ').trim();
const kr = (n: number) => `${Math.round(Number(n) || 0)} kr`;

export async function GET() {
  const site = await getSiteData();
  const s = site.settings;
  const B = SIDE_URL.replace(/\/$/, '');
  const navn = text(s, 'bedrift_navn', 'PrintFiksEB');
  const telefon = text(s, 'kontakt_telefon', '41381608');
  const epost = text(s, 'kontakt_epost');
  const sted = text(s, 'bedrift_sted', 'Sandsli, Bergen');
  const skole = text(s, 'bedrift_skole', 'Skranevatnet skole');
  const startpris = Number(text(s, 'pris_startpris', '0')) || 0;
  const startPa = !/^(nei|false|av|0)$/i.test(text(s, 'pris_startpris_pa', 'ja'));
  const dMin = text(s, 'levering_dager_min', '2');
  const dMaks = text(s, 'levering_dager_maks', '4');

  const l: string[] = [];
  l.push(`# ${navn}`, '');
  l.push(`> ${ren(text(s, 'tekst_hero_ingress')) || `${navn} er en elevbedrift på ${skole} i ${sted} som 3D-printer, reparerer og designer ting i plast.`}`, '');
  l.push(`${navn} (også skrevet PrintFiks) er en elevbedrift på ${skole} i ${sted}. Nettside: ${B}/`, '');

  l.push('## Om oss', '', ren(text(s, 'tekst_om_oss')), '');

  l.push('## Kontakt', '');
  l.push(`- Telefon og Vipps: ${formatPhone(telefon)}`);
  if (epost) l.push(`- E-post: ${epost}`);
  l.push(`- Sted: ${sted}`);
  if (text(s, 'kontakt_meldingstid')) l.push(`- ${ren(text(s, 'kontakt_meldingstid'))}`);
  if (text(s, 'kontakt_ringetid')) l.push(`- ${ren(text(s, 'kontakt_ringetid'))}`);
  for (const lenke of sosialeLenker(s)) l.push(`- ${lenke}`);
  l.push(`- Bestill på nettsiden: ${B}/bestill`, '');

  l.push('## Hva vi gjør', '');
  l.push(`- 3D-printing i plast (${site.materials.map((m) => m.name).join(', ') || 'PLA, PETG'}) – ferdige modeller fra galleriet eller dine egne ideer: ${B}/3d-printing`);
  l.push(`- Reparasjon: vi printer nye plastdeler til ting som har knekt. ${ren(text(s, 'tekst_reparasjon'))}`);
  l.push('- Design: vi tegner og printer ting etter dine mål og ønsker.');
  if (site.products.some((p) => p.spesial === 'deksel')) l.push(`- Mobildeksel med eget motiv (iPhone og Samsung) – design det selv og se det i 3D: ${B}/galleri/deksel`);
  if (site.products.some((p) => p.spesial === 'pepperkake')) l.push(`- Tegn din egen pepperkakeform – vi printer den: ${B}/galleri/pepperkake`);
  if (text(s, 'tekst_fikse_ikke')) l.push('', `Det vi ikke kan lage: ${ren(text(s, 'tekst_fikse_ikke'))}`);
  l.push('');

  l.push('## Priser, levering og betaling', '');
  l.push('- Ferdige modeller i galleriet har fast pris (se listen under).');
  if (site.materials.length) l.push(`- Egne utskrifter prises etter vekt: ${site.materials.map((m) => `${m.name} ${String(m.price_per_gram).replace('.', ',')} kr per gram`).join(', ')}.`);
  if (startPa && startpris > 0) l.push(`- Startpris på ${kr(startpris)} per bestilling for egne utskrifter og design (ikke for ferdige modeller fra galleriet).`);
  for (const e of site.extras) l.push(`- ${e.name}: ${kr(e.price)}${e.description ? ` – ${ren(e.description)}` : ''}`);
  for (const d of site.deliveryOptions) l.push(`- ${d.name}: ${Number(d.price) > 0 ? kr(d.price) : 'gratis'}${d.description ? ` – ${ren(d.description)}` : ''}`);
  l.push(`- Leveringstid: vanligvis ${dMin}–${dMaks} virkedager.`);
  if (text(s, 'betaling_tekst')) l.push(`- Betaling: ${ren(text(s, 'betaling_tekst'))}`);
  if (text(s, 'tekst_godkjenning')) l.push(`- ${ren(text(s, 'tekst_godkjenning'))}`);
  l.push('');

  if (site.products.length) {
    l.push('## Modeller i galleriet', '', `Hele galleriet: ${B}/galleri`, '');
    for (const p of site.products) {
      const fra = p.spesial ? 'fra ' : '';
      const beskr = ren(p.tagline || p.description);
      l.push(`- [${p.name}](${B}/galleri/${p.code ?? ''}): ${fra}${kr(p.price)}${p.category ? ` · ${p.category}` : ''}${beskr ? ` – ${beskr}` : ''}`);
    }
    l.push('');
  }

  if (site.faq.length) {
    l.push('## Vanlige spørsmål', '');
    for (const f of site.faq) l.push(`### ${ren(f.question)}`, '', ren(f.answer), '');
  }

  if (site.reviews.length) {
    l.push('## Hva kundene sier', '');
    for (const r of site.reviews.slice(0, 8)) l.push(`- «${ren(r.quote)}» – ${ren(r.name)}${r.place ? `, ${ren(r.place)}` : ''} (${r.stars}/5)`);
    l.push('');
  }

  l.push('## Sider', '');
  l.push(`- [Forside](${B}/)`, `- [Galleri](${B}/galleri)`, `- [Om oss, priser og spørsmål](${B}/om-oss)`, `- [3D-printing](${B}/3d-printing)`, `- [Bestill](${B}/bestill)`, '');

  return new Response(l.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
