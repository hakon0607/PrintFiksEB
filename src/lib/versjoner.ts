/**
 * Versjoner av en modell – i praksis mest størrelser, men dere bestemmer
 * navnet selv («Liten», «Stor», «Med navn» …). Hver versjon har egen pris,
 * eventuelt egen vekt og egne bilder. Modeller uten versjoner fungerer
 * akkurat som før.
 */

export type Versjon = {
  id: string;
  navn: string;
  pris: number;
  vekt_g: number | null;
  bilder: string[];
};

function tall(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Leser versjonene trygt, uansett hva som ligger i databasen. */
export function versjonerFor(p: { variants?: unknown } | null | undefined): Versjon[] {
  const raa = p?.variants;
  if (!Array.isArray(raa)) return [];
  return raa
    .map((v, i): Versjon | null => {
      if (!v || typeof v !== 'object') return null;
      const o = v as Record<string, unknown>;
      const navn = String(o.navn ?? '').trim();
      if (!navn) return null;
      return {
        id: String(o.id ?? `v${i}`),
        navn,
        pris: Math.max(0, tall(o.pris) ?? 0),
        vekt_g: tall(o.vekt_g),
        bilder: Array.isArray(o.bilder) ? (o.bilder as unknown[]).map(String).filter(Boolean) : [],
      };
    })
    .filter((v): v is Versjon => v !== null);
}

/** Laveste og høyeste pris. Uten versjoner er begge modellens egen pris. */
export function prisspenn(p: { price?: unknown; variants?: unknown }) {
  const versjoner = versjonerFor(p);
  if (versjoner.length === 0) {
    const pris = tall(p.price) ?? 0;
    return { min: pris, maks: pris, antall: 0 };
  }
  const priser = versjoner.map((v) => v.pris);
  return { min: Math.min(...priser), maks: Math.max(...priser), antall: versjoner.length };
}

export function nyVersjonId(): string {
  return `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
