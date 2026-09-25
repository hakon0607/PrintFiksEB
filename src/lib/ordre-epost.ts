import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ferdigEpost,
  finnMottakere,
  kundeEpost,
  sendEnkeltvis,
  sendEpost,
  varselEpost,
  type EpostLinje,
  type Kvittering,
} from './epost';

/**
 * Bygger kvitteringen ut fra en bestilling som allerede ligger i basen,
 * og sender den. Brukes både når vi oppretter bestilling selv og når vi
 * sender varselet på nytt fra E-post-siden.
 */

export type Utfall = {
  ok: boolean;
  kundeOk: boolean;
  varselOk: boolean;
  status: string;
  mottakere: string[];
  feil?: string;
};

async function innstillinger(service: SupabaseClient) {
  const { data } = await service
    .from('settings')
    .select('key,value')
    .in('key', [
      'bedrift_navn',
      'kontakt_telefon',
      'epost_avsender',
      'epost_bedrift',
      'levering_dager_min',
      'levering_dager_maks',
      'nettside_url',
    ]);
  const s: Record<string, string> = {};
  for (const rad of ((data as { key: string; value: string }[]) ?? [])) s[rad.key] = rad.value;
  return s;
}

export async function sendForOrdre(
  service: SupabaseClient,
  id: string,
  opsjoner: {
    origin: string;
    tilKunde: boolean;
    tilOss: boolean;
    /** «mottatt» = vanlig kvittering, «ferdig» = takk for handelen med endelig pris. */
    mal?: 'mottatt' | 'ferdig';
    /** Endelig pris, hvis den er rettet i admin før sending. Lagres også på bestillingen. */
    pris?: number;
  }
): Promise<Utfall> {
  const tomt: Utfall = { ok: false, kundeOk: false, varselOk: false, status: '', mottakere: [] };

  const { data: ordre } = await service.from('orders').select('*').eq('id', id).maybeSingle();
  if (!ordre) return { ...tomt, feil: 'Fant ikke bestillingen.' };
  const o = ordre as Record<string, unknown>;

  const { data: varer } = await service
    .from('order_items')
    .select('*')
    .eq('order_id', id)
    .order('sort');

  const s = await innstillinger(service);
  const avsender = s.epost_avsender || 'PrintFiksEB <post@printfiks.org>';
  const epost = String(o.epost ?? '').trim();

  // Er prisen rettet i admin, gjelder den – og vi lagrer den på bestillingen.
  const rettetPris =
    typeof opsjoner.pris === 'number' && Number.isFinite(opsjoner.pris) && opsjoner.pris >= 0
      ? Math.round(opsjoner.pris)
      : null;
  const sum = rettetPris ?? Number(o.pris ?? 0);
  if (rettetPris !== null && rettetPris !== Number(o.pris ?? 0)) {
    await service.from('orders').update({ pris: rettetPris }).eq('id', id);
  }

  const linjer: EpostLinje[] = ((varer as Record<string, unknown>[]) ?? []).map((v) => ({
    navn: String(v.name ?? 'Uten navn'),
    antall: Number(v.qty ?? 1),
    pris: `${Math.round(Number(v.qty ?? 1) * Number(v.unit_price ?? 0))} kr`,
  }));
  if (linjer.length === 0) {
    linjer.push({ navn: String(o.hva ?? 'Bestilling'), antall: 1, pris: 'Etter avtale' });
  }

  const kvittering: Kvittering = {
    ordrenr: String(o.ordrenr ?? ''),
    kunde: String(o.kunde ?? ''),
    telefon: String(o.telefon ?? ''),
    epost,
    adresse: String(o.adresse ?? ''),
    levering: String(o.levering ?? 'Henting'),
    betaling: String(o.betalingsmate ?? 'Vipps'),
    kommentar: String(o.notat ?? ''),
    linjer,
    sum: sum > 0 ? `${Math.round(sum)} kr` : 'Etter avtale',
    bedrift: s.bedrift_navn || 'PrintFiksEB',
    bedriftTelefon: s.kontakt_telefon || '41381608',
    nettside: s.nettside_url || opsjoner.origin,
    leveringstid: `${s.levering_dager_min || '2'}–${s.levering_dager_maks || '4'} virkedager`,
    fastPris: o.krever_godkjenning === false,
  };

  const mottakere = await finnMottakere(service, s.epost_bedrift ?? '');

  const ferdig = opsjoner.mal === 'ferdig';
  const kunde = ferdig ? ferdigEpost(kvittering) : kundeEpost(kvittering);
  const varsel = varselEpost(kvittering);

  const [k, v] = await Promise.all([
    opsjoner.tilKunde && epost
      ? sendEpost({ til: [epost], emne: kunde.emne, html: kunde.html, tekst: kunde.tekst, avsender })
      : Promise.resolve({ ok: false, feil: epost ? 'Ikke valgt' : 'Bestillingen mangler e-post' }),
    opsjoner.tilOss && mottakere.adresser.length > 0
      ? sendEnkeltvis({
          til: mottakere.adresser,
          emne: varsel.emne,
          html: varsel.html,
          tekst: varsel.tekst,
          avsender,
          svarTil: epost || undefined,
        })
      : Promise.resolve({
          ok: false,
          sendt: [] as string[],
          feilet: [
            {
              til: '(ingen)',
              feil:
                mottakere.adresser.length === 0
                  ? 'Ingen i bedriften har e-postadresse'
                  : 'Ikke valgt',
            },
          ],
        }),
  ]);

  const deler: string[] = [];
  if (opsjoner.tilKunde) {
    const navn = ferdig ? 'Ferdig kvittering' : 'Kvittering';
    deler.push(k.ok ? `${navn} sendt til kunden` : `${navn} feilet: ${k.feil ?? 'ukjent'}`);
  }
  if (opsjoner.tilOss) {
    if (v.sendt.length > 0) deler.push(`Varsel sendt til ${v.sendt.join(', ')}`);
    for (const f of v.feilet) deler.push(`Varsel til ${f.til} feilet: ${f.feil}`);
  }
  const status = deler.join(' | ');

  if ((opsjoner.tilKunde && !k.ok) || (opsjoner.tilOss && !v.ok)) {
    console.error('[ordre-epost] noe gikk ikke ut', {
      id,
      ordrenr: o.ordrenr,
      kunde: k.feil,
      varselFeilet: v.feilet,
      avsender,
    });
  }

  await service.from('orders').update({ epost_status: status.slice(0, 500) }).eq('id', id);

  return {
    ok: (!opsjoner.tilKunde || k.ok) && (!opsjoner.tilOss || v.ok),
    kundeOk: k.ok,
    varselOk: v.ok,
    status,
    mottakere: v.sendt.length > 0 ? v.sendt : mottakere.adresser,
    feil:
      k.ok && v.ok
        ? undefined
        : [k.ok ? '' : k.feil, ...v.feilet.map((f) => `${f.til}: ${f.feil}`)]
            .filter(Boolean)
            .join(' · '),
  };
}
