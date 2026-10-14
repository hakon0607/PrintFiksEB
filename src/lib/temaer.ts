/**
 * Sesongtemaer i galleriet. En kategori som heter noe med «Halloween»
 * eller «Jul» får automatisk sin egen drakt – farger, pynt og banner.
 *
 * Vil dere legge til et nytt tema senere (påske, 17. mai …), lag et nytt
 * objekt her og en scene i components/TemaPynt.tsx. Klassene må stå
 * ferdig skrevet her, ellers finner ikke Tailwind dem.
 */

export type TemaId = 'halloween' | 'jul';

export type Tema = {
  id: TemaId;
  /** Kategorinavn som utløser temaet. */
  ord: RegExp;
  /** Måneder (1–12) temaet er i sesong. Da kommer det øverst i galleriet. */
  sesong: number[];
  tittel: string;
  undertekst: string;
  /** Bakgrunn og tekstfarge på hele seksjonen. */
  seksjon: string;
  tittelFarge: string;
  tekstFarge: string;
  /** Liten etikett over tittelen. */
  etikett: string;
  /** Produktkortene i temaet. */
  kortRamme: string;
  prisMerke: string;
  hjorneMerke: string;
  /** Knappen i banneret. */
  knapp: string;
};

export const TEMAER: Tema[] = [
  {
    id: 'halloween',
    ord: /hallo?w(e|ee)n|grøss|skummel/i,
    sesong: [9, 10],
    tittel: 'Halloween',
    undertekst: 'Gresskar, flaggermus og ting som skremmer – printet og klare til å pynte med.',
    seksjon: 'bg-gradient-to-b from-[#1c0f30] via-[#28123f] to-[#140b22] text-white',
    tittelFarge: 'text-orange-300',
    tekstFarge: 'text-violet-100/80',
    etikett: 'bg-orange-500/15 text-orange-200 ring-1 ring-orange-400/30',
    kortRamme: 'ring-2 ring-orange-400/60 shadow-[0_18px_40px_-18px_rgba(249,115,22,0.55)]',
    prisMerke: '!bg-orange-100 !text-orange-700',
    hjorneMerke: 'bg-orange-500 text-white',
    knapp: 'bg-orange-500 text-white hover:bg-orange-400',
  },
  {
    id: 'jul',
    ord: /\bjul(?!i)|christmas|xmas|nisse/i,
    sesong: [11, 12],
    tittel: 'Jul',
    undertekst: 'Julepynt, gaver og små ting til adventstiden – laget her hos oss på Sandsli.',
    seksjon: 'bg-gradient-to-b from-[#0c3326] via-[#0f3d2e] to-[#09271d] text-white',
    tittelFarge: 'text-amber-200',
    tekstFarge: 'text-emerald-50/80',
    etikett: 'bg-red-500/15 text-red-100 ring-1 ring-red-300/30',
    kortRamme: 'ring-2 ring-red-400/60 shadow-[0_18px_40px_-18px_rgba(220,38,38,0.5)]',
    prisMerke: '!bg-red-50 !text-red-700',
    hjorneMerke: 'bg-red-600 text-white',
    knapp: 'bg-red-600 text-white hover:bg-red-500',
  },
];

export function temaFor(kategori: string | null | undefined): Tema | null {
  const k = String(kategori ?? '').trim();
  if (!k) return null;
  return TEMAER.find((t) => t.ord.test(k)) ?? null;
}

export function iSesong(tema: Tema, dato = new Date()): boolean {
  return tema.sesong.includes(dato.getMonth() + 1);
}
