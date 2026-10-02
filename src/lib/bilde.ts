/**
 * Bilder kunden legger ved bestillingen – mål, skisser eller bilde av
 * den ødelagte delen. Vi krymper dem i nettleseren FØR de sendes, så
 * en mobilbilde på 6 MB ikke velter innsendingen.
 */

/** Hvor mange bilder man får legge ved én bestilling. */
export const MAKS_BILDER = 2;

/** Lengste side etter krymping. Nok til å lese mål på et ark. */
const MAKS_PIKSLER = 1600;

/** Så store får de være etter krymping. */
const MAKS_BYTES = 700 * 1024;

/** Filtyper vi tar imot. */
export const GODTATTE_TYPER = ['image/jpeg', 'image/png', 'image/webp'];

export type Krympet = { dataUrl: string; bytes: number; navn: string };

function lesSomDataUrl(fil: File): Promise<string> {
  return new Promise((ja, nei) => {
    const leser = new FileReader();
    leser.onload = () => ja(String(leser.result));
    leser.onerror = () => nei(new Error('Klarte ikke å lese filen'));
    leser.readAsDataURL(fil);
  });
}

function lastBilde(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((ja, nei) => {
    const bilde = new window.Image();
    bilde.onload = () => ja(bilde);
    bilde.onerror = () => nei(new Error('Klarte ikke å åpne bildet'));
    bilde.src = dataUrl;
  });
}

/** Hvor mange byte ligger det i en data-URL? */
export function bytesIDataUrl(dataUrl: string): number {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.floor((b64.length * 3) / 4);
}

/**
 * Skalerer ned og komprimerer til JPEG. Kommer vi ikke under grensen
 * på første forsøk, senker vi kvaliteten i trinn.
 */
export async function krympBilde(fil: File): Promise<Krympet> {
  const original = await lesSomDataUrl(fil);
  const bilde = await lastBilde(original);

  const storst = Math.max(bilde.naturalWidth, bilde.naturalHeight);
  const skala = storst > MAKS_PIKSLER ? MAKS_PIKSLER / storst : 1;
  const bredde = Math.max(1, Math.round(bilde.naturalWidth * skala));
  const hoyde = Math.max(1, Math.round(bilde.naturalHeight * skala));

  const lerret = document.createElement('canvas');
  lerret.width = bredde;
  lerret.height = hoyde;
  const ctx = lerret.getContext('2d');
  if (!ctx) throw new Error('Nettleseren klarte ikke å behandle bildet');
  ctx.drawImage(bilde, 0, 0, bredde, hoyde);

  let dataUrl = '';
  for (const kvalitet of [0.82, 0.7, 0.6, 0.5, 0.4]) {
    dataUrl = lerret.toDataURL('image/jpeg', kvalitet);
    if (bytesIDataUrl(dataUrl) <= MAKS_BYTES) break;
  }

  const bytes = bytesIDataUrl(dataUrl);
  if (bytes > MAKS_BYTES * 2) {
    throw new Error('Bildet er for stort selv etter krymping. Prøv et annet bilde.');
  }

  return { dataUrl, bytes, navn: fil.name };
}

/** 412 kB */
export function visStorrelse(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
