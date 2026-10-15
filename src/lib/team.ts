/** Hjelpere for teamet: egne sider per person (/om-oss/trym-simmenes). */
import type { TeamMember } from './types';

export function navnTilSti(navn: string): string {
  return navn
    .toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'person';
}

/** Teamet med en unik adresse per person. */
export function medSti(team: TeamMember[]): (TeamMember & { sti: string })[] {
  const brukt = new Map<string, number>();
  return team.map((m) => {
    const grunn = navnTilSti(m.name);
    const n = (brukt.get(grunn) ?? 0) + 1;
    brukt.set(grunn, n);
    return { ...m, sti: n === 1 ? grunn : `${grunn}-${n}` };
  });
}
