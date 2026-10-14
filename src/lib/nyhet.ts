/**
 * «Nyhet» – ett produkt eller ett tema (Halloween, Jul) som løftes høyt opp
 * på forsiden og i galleriet. Styres fra Admin → Galleri → Nyhet.
 *
 * Innstillinger:
 *   nyhet_type   'av' | 'produkt' | 'tema'
 *   nyhet_verdi  produktets ID (code) eller tema-id ('halloween' | 'jul')
 *   nyhet_tittel valgfri overskrift (ellers produktnavnet / temanavnet)
 *   nyhet_tekst  valgfri kort tekst (ellers undertittel / temaets tekst)
 *   nyhet_etikett liten merkelapp, standard «Nyhet»
 */
import type { Product } from './types';
import { TEMAER, temaFor, type Tema } from './temaer';

export type NyhetType = 'av' | 'produkt' | 'tema';

export type Nyhet =
  | { type: 'produkt'; produkt: Product; tittel: string; tekst: string; etikett: string }
  | { type: 'tema'; tema: Tema; kategori: string | null; produkter: Product[]; tittel: string; tekst: string; etikett: string };

export function finnNyhet(settings: Record<string, string>, produkter: Product[]): Nyhet | null {
  const type = (settings.nyhet_type ?? 'av').trim() as NyhetType;
  const verdi = (settings.nyhet_verdi ?? '').trim();
  const tittel = (settings.nyhet_tittel ?? '').trim();
  const tekst = (settings.nyhet_tekst ?? '').trim();
  const etikett = (settings.nyhet_etikett ?? '').trim() || 'Nyhet';
  if (!verdi || type === 'av') return null;

  if (type === 'produkt') {
    const p = produkter.find((x) => (x.code ?? '').toLowerCase() === verdi.toLowerCase() || x.id === verdi);
    if (!p) return null;
    return { type, produkt: p, tittel: tittel || p.name, tekst: tekst || p.tagline || p.description || '', etikett };
  }

  if (type === 'tema') {
    const tema = TEMAER.find((t) => t.id === verdi);
    if (!tema) return null;
    const iTema = produkter.filter((p) => temaFor(p.category)?.id === tema.id);
    const kategori = iTema[0]?.category?.trim() || null;
    return { type, tema, kategori, produkter: iTema, tittel: tittel || tema.tittel, tekst: tekst || tema.undertekst, etikett };
  }
  return null;
}
