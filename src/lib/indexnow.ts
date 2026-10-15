/**
 * IndexNow: sier fra til Bing (som også brukes av ChatGPT-søk og Copilot),
 * Yandex, Seznam og Naver med en gang noe er publisert – i stedet for å vente
 * på at de kommer innom av seg selv. Google bruker ikke IndexNow.
 *
 * Nøkkelen er offentlig med vilje: den ligger som /4d0c4858f2082d76478f00fb77a1d0f8.txt
 */
import { getSiteDataFresh } from './data';
import { medSti } from './team';
import { SIDE_URL } from './side-url';

export const INDEXNOW_NOKKEL = '4d0c4858f2082d76478f00fb77a1d0f8';

/** Alle sidene våre, som fulle adresser. */
export async function alleSider(): Promise<string[]> {
  const B = SIDE_URL.replace(/\/$/, '');
  const sider = ['/', '/galleri', '/om-oss', '/bestill', '/3d-printing', '/llms.txt'];
  try {
    const site = await getSiteDataFresh();
    for (const p of site.products) if (p.code) sider.push(`/galleri/${encodeURIComponent(p.code)}`);
    for (const m of medSti(site.team)) sider.push(`/om-oss/${m.sti}`);
  } catch {
    /* de faste sidene holder */
  }
  return sider.map((s) => `${B}${s}`);
}

/** Varsler søkemotorene. Feiler stille – publiseringen skal aldri stoppe av dette. */
export async function varsleSokemotorer(): Promise<boolean> {
  try {
    const B = new URL(SIDE_URL);
    const urlList = (await alleSider()).slice(0, 10000);
    const kontroll = new AbortController();
    const t = setTimeout(() => kontroll.abort(), 5000);
    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: B.host,
        key: INDEXNOW_NOKKEL,
        keyLocation: `${B.origin}/${INDEXNOW_NOKKEL}.txt`,
        urlList,
      }),
      signal: kontroll.signal,
    });
    clearTimeout(t);
    return r.ok;
  } catch {
    return false;
  }
}
