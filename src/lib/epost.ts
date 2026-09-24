import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * E-post ut fra nettsiden – kvittering til kunden og varsel til oss.
 * Sendes med Resend. Nøkkelen ligger som RESEND_API_KEY i Vercel.
 */

export type EpostLinje = { navn: string; antall: number; pris: string };

export type Kvittering = {
  ordrenr: string;
  kunde: string;
  telefon: string;
  epost: string;
  adresse: string;
  levering: string;
  betaling: string;
  kommentar: string;
  linjer: EpostLinje[];
  sum: string;
  bedrift: string;
  bedriftTelefon: string;
  nettside: string;
  leveringstid: string;
  /** Bare ferdige modeller til fast pris? Da trengs ingen godkjenning. */
  fastPris?: boolean;
};

function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ------------------------------------------------------------------ */
/*  Kvitteringen kunden får                                            */
/* ------------------------------------------------------------------ */

export function kundeEpost(k: Kvittering): { emne: string; html: string; tekst: string } {
  const linjer = k.linjer
    .map(
      (l, i) => `
      <tr class="linje" style="animation-delay:${0.25 + i * 0.08}s">
        <td style="padding:14px 0;border-bottom:1px solid #ECEEF2;">
          <span style="display:inline-block;min-width:26px;height:26px;line-height:26px;text-align:center;background:#EFF5FF;color:#2559C7;border-radius:999px;font-weight:700;font-size:12px;">${l.antall}×</span>
          <span style="margin-left:10px;font-weight:600;color:#14171C;">${esc(l.navn)}</span>
        </td>
        <td align="right" style="padding:14px 0;border-bottom:1px solid #ECEEF2;font-weight:700;color:#14171C;white-space:nowrap;">${esc(l.pris)}</td>
      </tr>`
    )
    .join('');

  const html = `<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Takk for bestillingen</title>
<style>
  @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pop { 0% { transform:scale(0.6); opacity:0; } 60% { transform:scale(1.08); opacity:1; } 100% { transform:scale(1); } }
  @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
  @keyframes shine { 0% { background-position:-220% 0; } 100% { background-position:220% 0; } }
  .fade { animation: fadeUp .7s cubic-bezier(.22,1,.36,1) both; }
  .linje { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) both; }
  .merke { animation: pop .8s cubic-bezier(.22,1,.36,1) both; }
  .bob { animation: float 3.4s ease-in-out infinite; }
  .glimt {
    background:linear-gradient(100deg,#2559C7 20%,#6499F7 40%,#2559C7 60%);
    background-size:220% 100%; animation: shine 3.5s linear infinite;
  }
  @media (prefers-reduced-motion: reduce) { .fade,.linje,.merke,.bob,.glimt { animation:none !important; } }
  @media (max-width:520px) { .pad { padding:22px !important; } .stor { font-size:26px !important; } }
</style>
</head>
<body style="margin:0;padding:0;background:#EFF3FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#14171C;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Bestilling ${esc(k.ordrenr)} er mottatt – vi tar kontakt snart.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFF3FA;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:26px;overflow:hidden;box-shadow:0 20px 50px -28px rgba(20,23,28,.45);">

        <!-- Topp -->
        <tr><td class="glimt pad" style="padding:34px 30px;background:#2559C7;color:#fff;text-align:center;">
          <div class="merke bob" style="width:62px;height:62px;margin:0 auto 14px;border-radius:999px;background:rgba(255,255,255,.18);line-height:62px;font-size:30px;">✓</div>
          <p class="fade" style="margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.85;font-weight:700;">${esc(k.bedrift)}</p>
          <h1 class="fade stor" style="margin:8px 0 0;font-size:30px;line-height:1.15;font-weight:800;">Takk for bestillingen!</h1>
          <p class="fade" style="margin:10px 0 0;font-size:15px;opacity:.9;">Bestilling <strong>#${esc(k.ordrenr)}</strong></p>
        </td></tr>

        <!-- Hva skjer nå -->
        <tr><td class="pad" style="padding:26px 30px 6px;">
          <p class="fade" style="margin:0 0 6px;font-size:16px;line-height:1.6;">Hei ${esc(k.kunde.split(' ')[0] || k.kunde)}!</p>
          <p class="fade" style="margin:0;font-size:15px;line-height:1.65;color:#525A6B;">
            ${
              k.fastPris
                ? 'Vi har fått bestillingen din. Dette er ferdige modeller med <strong style="color:#14171C;">fast pris</strong>, så vi setter i gang med en gang – ingen godkjenning trengs. Vi tar kontakt om noe er uklart, og når den er klar til henting eller levering.'
                : 'Vi har fått bestillingen din og tar kontakt så fort vi kan – på telefon eller melding – for å avtale detaljene og om vi trenger å møtes eller måle opp noe. <strong style="color:#14171C;">Du får en endelig pris som du må godkjenne før vi starter å printe.</strong>'
            }
          </p>
        </td></tr>

        <!-- Stegene -->
        <tr><td class="pad" style="padding:20px 30px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="fade" style="background:#F6F8FC;border-radius:18px;">
            <tr>
              <td style="padding:16px 18px;font-size:13px;line-height:1.5;color:#3D4453;">
                <div style="margin-bottom:8px;"><strong style="color:#2559C7;">1.</strong> ${
                  k.fastPris ? 'Vi bekrefter bestillingen' : 'Vi tar kontakt og avtaler detaljer'
                }</div>
                <div style="margin-bottom:8px;"><strong style="color:#2559C7;">2.</strong> ${
                  k.fastPris
                    ? 'Fast pris – ingen godkjenning nødvendig'
                    : 'Du får endelig pris og godkjenner den'
                }</div>
                <div style="margin-bottom:8px;"><strong style="color:#2559C7;">3.</strong> Vi printer – ferdig på ${esc(k.leveringstid)}</div>
                <div><strong style="color:#2559C7;">4.</strong> Du henter, eller vi leverer hjem til deg</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Varene -->
        <tr><td class="pad" style="padding:24px 30px 0;">
          <p class="fade" style="margin:0 0 4px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#8891A2;">Dette bestilte du</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${linjer}
            <tr>
              <td style="padding:16px 0 0;font-weight:800;color:#14171C;">Estimert pris</td>
              <td align="right" style="padding:16px 0 0;font-weight:800;font-size:20px;color:#2559C7;">${esc(k.sum)}</td>
            </tr>
          </table>
          <p style="margin:10px 0 0;font-size:12px;line-height:1.55;color:#697285;">
            ${
              k.fastPris
                ? 'Dette er fast pris. Bestillingen er bindende – vil du avbestille, må du si fra før vi har startet produksjonen.'
                : 'Dette er et estimat. Endelig pris får du fra oss før vi starter. Bestillingen er bindende når du har godkjent prisen.'
            }
          </p>
        </td></tr>

        <!-- Detaljer -->
        <tr><td class="pad" style="padding:22px 30px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="fade" style="border:1px solid #ECEEF2;border-radius:18px;">
            <tr><td style="padding:16px 18px;font-size:14px;line-height:1.7;color:#3D4453;">
              <div><strong style="color:#14171C;">Navn:</strong> ${esc(k.kunde)}</div>
              <div><strong style="color:#14171C;">Telefon:</strong> ${esc(k.telefon)}</div>
              ${k.adresse ? `<div><strong style="color:#14171C;">Adresse:</strong> ${esc(k.adresse)}</div>` : ''}
              <div><strong style="color:#14171C;">Levering:</strong> ${esc(k.levering)}</div>
              <div><strong style="color:#14171C;">Betaling:</strong> ${esc(k.betaling)}</div>
              ${k.kommentar ? `<div style="margin-top:8px;"><strong style="color:#14171C;">Din melding:</strong> ${esc(k.kommentar)}</div>` : ''}
            </td></tr>
          </table>
        </td></tr>

        <!-- Bilder -->
        <tr><td class="pad" style="padding:18px 30px 0;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#697285;background:#FFF8E8;border-radius:14px;padding:12px 16px;">
            Har du bilde av det som skal fikses, eller en 3D-fil? Send det på melding til
            <strong style="color:#14171C;">${esc(k.bedriftTelefon)}</strong> når vi tar kontakt.
          </p>
        </td></tr>

        <!-- Bunn -->
        <tr><td class="pad" style="padding:26px 30px 30px;text-align:center;">
          <a href="${esc(k.nettside)}" class="fade" style="display:inline-block;background:#2559C7;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:999px;">Se nettsiden vår</a>
          <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#8891A2;">
            ${esc(k.bedrift)} · elevbedrift på Skranevatnet skole<br />
            Spørsmål? Ring eller send melding til ${esc(k.bedriftTelefon)}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const tekst = [
    `Takk for bestillingen! Bestilling #${k.ordrenr}`,
    '',
    k.fastPris
      ? 'Dette er ferdige modeller med fast pris, så vi setter i gang med en gang. Vi tar kontakt når den er klar.'
      : 'Vi tar kontakt så fort vi kan for å avtale detaljene. Du får en endelig pris som du må godkjenne før vi starter å printe.',
    '',
    'Dette bestilte du:',
    ...k.linjer.map((l) => `- ${l.antall}x ${l.navn} – ${l.pris}`),
    `Estimert pris: ${k.sum}`,
    '',
    `Navn: ${k.kunde}`,
    `Telefon: ${k.telefon}`,
    k.adresse ? `Adresse: ${k.adresse}` : '',
    `Levering: ${k.levering}`,
    `Betaling: ${k.betaling}`,
    k.kommentar ? `Melding: ${k.kommentar}` : '',
    '',
    `Har du bilde eller 3D-fil? Send det på melding til ${k.bedriftTelefon}.`,
    '',
    k.bedrift,
  ]
    .filter(Boolean)
    .join('\n');

  return { emne: `Bestilling #${k.ordrenr} er mottatt – ${k.bedrift}`, html, tekst };
}

/* ------------------------------------------------------------------ */
/*  Varselet vi får selv                                               */
/* ------------------------------------------------------------------ */

export function varselEpost(k: Kvittering): { emne: string; html: string; tekst: string } {
  const linjer = k.linjer
    .map((l) => `<li style="margin-bottom:4px;">${l.antall}× ${esc(l.navn)} – ${esc(l.pris)}</li>`)
    .join('');

  const html = `<!doctype html><html lang="nb"><body style="margin:0;background:#F4F6FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#14171C;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#fff;border-radius:22px;overflow:hidden;">
      <tr><td style="background:#14171C;color:#fff;padding:22px 26px;">
        <p style="margin:0;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#96BDFB;font-weight:700;">Ny bestilling</p>
        <h1 style="margin:6px 0 0;font-size:22px;">#${esc(k.ordrenr)} · ${esc(k.kunde)}</h1>
      </td></tr>
      <tr><td style="padding:22px 26px;font-size:15px;line-height:1.7;color:#3D4453;">
        <ul style="margin:0 0 14px;padding-left:18px;">${linjer}</ul>
        <div><strong>Estimert:</strong> ${esc(k.sum)}</div>
        <div><strong>Telefon:</strong> <a href="tel:${esc(k.telefon)}" style="color:#2559C7;">${esc(k.telefon)}</a></div>
        <div><strong>E-post:</strong> <a href="mailto:${esc(k.epost)}" style="color:#2559C7;">${esc(k.epost)}</a></div>
        ${k.adresse ? `<div><strong>Adresse:</strong> ${esc(k.adresse)}</div>` : ''}
        <div><strong>Levering:</strong> ${esc(k.levering)} · <strong>Betaling:</strong> ${esc(k.betaling)}</div>
        ${k.kommentar ? `<div style="margin-top:10px;background:#F6F8FC;border-radius:12px;padding:12px 14px;">${esc(k.kommentar)}</div>` : ''}
        <p style="margin:18px 0 0;font-size:13px;color:#697285;">${
          k.fastPris
            ? 'Fast pris fra galleriet – ingen godkjenning trengs, bare sett i gang.'
            : 'Husk å ringe kunden og sende endelig pris til godkjenning.'
        }</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const tekst = [
    `Ny bestilling #${k.ordrenr} fra ${k.kunde}`,
    ...k.linjer.map((l) => `- ${l.antall}x ${l.navn} – ${l.pris}`),
    `Estimert: ${k.sum}`,
    `Telefon: ${k.telefon}`,
    `E-post: ${k.epost}`,
    k.adresse ? `Adresse: ${k.adresse}` : '',
    `Levering: ${k.levering} · Betaling: ${k.betaling}`,
    k.kommentar ? `Melding: ${k.kommentar}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return { emne: `Ny bestilling #${k.ordrenr} – ${k.kunde}`, html, tekst };
}

/* ------------------------------------------------------------------ */
/*  Sending                                                            */
/* ------------------------------------------------------------------ */

export type Avsendervei = 'smtp' | 'resend' | 'ingen';

/** Leser SMTP-oppsettet fra miljøvariablene. Gmail er forhåndsutfylt. */
export function smtpOppsett() {
  const bruker = (process.env.SMTP_BRUKER || process.env.GMAIL_BRUKER || '').trim();
  const passord = (process.env.SMTP_PASSORD || process.env.GMAIL_APP_PASSORD || '').replace(/\s+/g, '');
  if (!bruker || !passord) return null;
  const vert = (process.env.SMTP_VERT || 'smtp.gmail.com').trim();
  const port = Number(process.env.SMTP_PORT || 465);
  return { vert, port, bruker, passord, sikker: port === 465 };
}

/** Hvilken vei sendes e-posten? */
export function avsendervei(): Avsendervei {
  if (smtpOppsett()) return 'smtp';
  if (process.env.RESEND_API_KEY) return 'resend';
  return 'ingen';
}

export function harEpostOppsett(): boolean {
  return avsendervei() !== 'ingen';
}

/**
 * Gmail (og de fleste SMTP-tjenere) overstyrer avsenderadressen til kontoen
 * som logger inn. Vi beholder derfor bare navnet fra innstillingen.
 */
function byggAvsender(onsket: string, konto: string): string {
  const navn = (onsket.match(/^\s*"?([^"<]+?)"?\s*</) || [])[1]?.trim();
  return navn ? `"${navn.replace(/"/g, '')}" <${konto}>` : konto;
}

async function sendMedSmtp(opts: {
  til: string[];
  emne: string;
  html: string;
  tekst: string;
  avsender: string;
  svarTil?: string;
}): Promise<{ ok: boolean; feil?: string }> {
  const opp = smtpOppsett();
  if (!opp) return { ok: false, feil: 'Mangler SMTP-oppsett' };
  try {
    const nodemailer = (await import('nodemailer')).default;
    const sender = nodemailer.createTransport({
      host: opp.vert,
      port: opp.port,
      secure: opp.sikker,
      auth: { user: opp.bruker, pass: opp.passord },
      connectionTimeout: 15000,
      greetingTimeout: 12000,
      socketTimeout: 20000,
    });
    await sender.sendMail({
      from: byggAvsender(opts.avsender, opp.bruker),
      to: opts.til.join(', '),
      subject: opts.emne,
      html: opts.html,
      text: opts.tekst,
      ...(opts.svarTil ? { replyTo: opts.svarTil } : {}),
    });
    return { ok: true };
  } catch (e) {
    const m = e instanceof Error ? e.message : 'Ukjent SMTP-feil';
    if (/invalid login|username and password not accepted|535/i.test(m)) {
      return {
        ok: false,
        feil:
          'SMTP avviste innloggingen. Sjekk at app-passordet er riktig, og at det er laget på samme konto som adressen.',
      };
    }
    return { ok: false, feil: `SMTP: ${m}` };
  }
}

async function sendMedResend(opts: {
  til: string[];
  emne: string;
  html: string;
  tekst: string;
  avsender: string;
  svarTil?: string;
}): Promise<{ ok: boolean; feil?: string }> {
  const nokkel = process.env.RESEND_API_KEY;
  if (!nokkel) return { ok: false, feil: 'Mangler RESEND_API_KEY' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${nokkel}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: opts.avsender || 'PrintFiksEB <onboarding@resend.dev>',
        to: opts.til,
        subject: opts.emne,
        html: opts.html,
        text: opts.tekst,
        ...(opts.svarTil ? { reply_to: opts.svarTil } : {}),
      }),
    });
    if (!res.ok) {
      const tekst = await res.text().catch(() => '');
      return { ok: false, feil: `Resend svarte ${res.status}: ${tekst.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, feil: e instanceof Error ? e.message : 'Ukjent feil' };
  }
}

/** Sender e-posten via SMTP hvis det er satt opp, ellers Resend. */
export async function sendEpost(opts: {
  til: string[];
  emne: string;
  html: string;
  tekst: string;
  avsender: string;
  svarTil?: string;
}): Promise<{ ok: boolean; feil?: string }> {
  const mottakere = opts.til.map((t) => t.trim()).filter(Boolean);
  if (mottakere.length === 0) return { ok: false, feil: 'Ingen mottakere' };
  const arg = { ...opts, til: mottakere };

  const vei = avsendervei();
  if (vei === 'ingen') {
    return { ok: false, feil: 'Ingen e-post er satt opp på serveren' };
  }
  if (vei === 'smtp') {
    const res = await sendMedSmtp(arg);
    // Faller tilbake til Resend hvis SMTP er nede, men ikke ved feil passord
    if (!res.ok && process.env.RESEND_API_KEY && !/avviste innloggingen/.test(res.feil ?? '')) {
      const res2 = await sendMedResend(arg);
      if (res2.ok) return res2;
    }
    return res;
  }
  return sendMedResend(arg);
}

/* ------------------------------------------------------------------ */
/*  Hvem skal ha varsel når det kommer en bestilling?                  */
/* ------------------------------------------------------------------ */

export function gyldigEpost(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());
}

/** Splitter «a@b.no, c@d.no» og rydder bort tomt og ugyldig. */
export function lesAdresser(raa: string): string[] {
  return String(raa ?? '')
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e && gyldigEpost(e));
}

export type Mottakere = {
  adresser: string[];
  fraAnsatte: string[];
  fraInnstilling: string[];
  /** Ingen hadde huket av, så vi tok alle ansatte med e-post. */
  reserveBrukt: boolean;
  /** Kolonnen varsel_bestilling finnes ikke ennå – SQL-en er ikke kjørt. */
  manglerKolonne: boolean;
};

/**
 * Finner adressene varselet skal til.
 * Rekkefølge: de som har huket av → ellers alle ansatte med e-post.
 * E-posten i innstillingene legges alltid til.
 */
export async function finnMottakere(
  service: SupabaseClient,
  epostBedrift: string
): Promise<Mottakere> {
  const fraInnstilling = lesAdresser(epostBedrift);
  let fraAnsatte: string[] = [];
  let reserveBrukt = false;
  let manglerKolonne = false;

  const alle = await service.from('team_members').select('email,varsel_bestilling');
  if (alle.error) {
    // Kolonnen finnes ikke ennå – hent i hvert fall e-postene.
    manglerKolonne = true;
    const bare = await service.from('team_members').select('email');
    const rader = ((bare.data as { email: string | null }[]) ?? []).map((r) => r.email ?? '');
    fraAnsatte = rader.flatMap(lesAdresser);
    reserveBrukt = fraAnsatte.length > 0;
  } else {
    const rader = (alle.data as { email: string | null; varsel_bestilling: boolean | null }[]) ?? [];
    fraAnsatte = rader.filter((r) => r.varsel_bestilling).flatMap((r) => lesAdresser(r.email ?? ''));
    if (fraAnsatte.length === 0) {
      // Ingen har huket av. Da er det bedre å varsle alle enn ingen.
      fraAnsatte = rader.flatMap((r) => lesAdresser(r.email ?? ''));
      reserveBrukt = fraAnsatte.length > 0;
    }
  }

  const adresser = [...new Set([...fraAnsatte, ...fraInnstilling])];
  return { adresser, fraAnsatte, fraInnstilling, reserveBrukt, manglerKolonne };
}

/** Enkel test-e-post vi bruker fra admin for å se at oppsettet virker. */
export function testEpost(bedrift: string): { emne: string; html: string; tekst: string } {
  const emne = `Test fra ${bedrift}`;
  const html = `<!doctype html><html lang="nb"><body style="margin:0;background:#EFF3FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:18px;padding:32px;box-shadow:0 12px 32px rgba(20,23,28,.08);">
      <tr><td align="center">
        <div style="width:56px;height:56px;line-height:56px;border-radius:999px;background:#E8F7EE;color:#1B8A4B;font-size:28px;">&#10003;</div>
        <h1 style="margin:18px 0 8px;font-size:22px;color:#14171C;">E-posten virker</h1>
        <p style="margin:0;font-size:15px;line-height:1.6;color:#5A6270;">
          Får du denne, kommer varselet fram når noen bestiller på nettsiden.
        </p>
        <p style="margin:18px 0 0;font-size:13px;color:#8A919C;">${esc(bedrift)}</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  const tekst = `E-posten virker. Får du denne, kommer varselet fram når noen bestiller. – ${bedrift}`;
  return { emne, html, tekst };
}

/* ------------------------------------------------------------------ */
/*  Ferdig kvittering – sendes når bestillingen er levert              */
/* ------------------------------------------------------------------ */

export function ferdigEpost(k: Kvittering): { emne: string; html: string; tekst: string } {
  const linjer = k.linjer
    .map(
      (l, i) => `
      <tr class="linje" style="animation-delay:${0.25 + i * 0.08}s">
        <td style="padding:14px 0;border-bottom:1px solid #ECEEF2;">
          <span style="display:inline-block;min-width:26px;height:26px;line-height:26px;text-align:center;background:#E8F7EE;color:#1B8A4B;border-radius:999px;font-weight:700;font-size:12px;">${l.antall}×</span>
          <span style="margin-left:10px;font-weight:600;color:#14171C;">${esc(l.navn)}</span>
        </td>
        <td align="right" style="padding:14px 0;border-bottom:1px solid #ECEEF2;font-weight:700;color:#14171C;white-space:nowrap;">${esc(l.pris)}</td>
      </tr>`
    )
    .join('');

  const html = `<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Takk for handelen</title>
<style>
  @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pop { 0% { transform:scale(.6); opacity:0; } 60% { transform:scale(1.08); opacity:1; } 100% { transform:scale(1); } }
  @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
  .fade { animation: fadeUp .7s cubic-bezier(.22,1,.36,1) both; }
  .linje { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) both; }
  .merke { animation: pop .8s cubic-bezier(.22,1,.36,1) both; }
  .bob { animation: float 3.4s ease-in-out infinite; }
  @media (prefers-reduced-motion: reduce) { .fade,.linje,.merke,.bob { animation:none !important; } }
  @media (max-width:520px) { .pad { padding:22px !important; } .stor { font-size:26px !important; } }
</style>
</head>
<body style="margin:0;padding:0;background:#EFF3FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#14171C;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Bestilling ${esc(k.ordrenr)} er ferdig. Takk for handelen!</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFF3FA;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:26px;overflow:hidden;box-shadow:0 18px 44px rgba(20,23,28,.10);">

        <!-- Topp -->
        <tr><td class="pad" style="padding:38px 30px 28px;text-align:center;background:linear-gradient(160deg,#F2FBF5 0%,#FFFFFF 70%);">
          <div class="merke bob" style="width:66px;height:66px;line-height:66px;margin:0 auto;border-radius:999px;background:#1B8A4B;color:#fff;font-size:32px;">&#10003;</div>
          <h1 class="fade stor" style="margin:20px 0 6px;font-size:30px;line-height:1.2;font-weight:800;color:#14171C;">Takk for handelen!</h1>
          <p class="fade" style="margin:0;font-size:15px;line-height:1.65;color:#5A6270;">
            Bestillingen din er ferdig og levert. Håper du blir fornøyd.
          </p>
          ${
            k.ordrenr
              ? `<p class="fade" style="margin:16px 0 0;"><span style="display:inline-block;background:#14171C;color:#fff;border-radius:999px;padding:7px 16px;font-size:13px;font-weight:700;letter-spacing:.04em;">Bestilling #${esc(k.ordrenr)}</span></p>`
              : ''
          }
        </td></tr>

        <!-- Varene -->
        <tr><td class="pad" style="padding:24px 30px 0;">
          <p class="fade" style="margin:0 0 4px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#8891A2;">Dette fikk du</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${linjer}
            <tr>
              <td style="padding:16px 0 0;font-weight:800;color:#14171C;">Å betale</td>
              <td align="right" style="padding:16px 0 0;font-weight:800;font-size:22px;color:#1B8A4B;">${esc(k.sum)}</td>
            </tr>
          </table>
          <p style="margin:10px 0 0;font-size:12px;line-height:1.55;color:#697285;">
            Dette er den endelige prisen. Betales med ${esc(k.betaling)}.
          </p>
        </td></tr>

        <!-- Detaljer -->
        <tr><td class="pad" style="padding:22px 30px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="fade" style="border:1px solid #ECEEF2;border-radius:18px;">
            <tr><td style="padding:16px 18px;font-size:14px;line-height:1.7;color:#3D4453;">
              <div><strong style="color:#14171C;">Navn:</strong> ${esc(k.kunde)}</div>
              <div><strong style="color:#14171C;">Telefon:</strong> ${esc(k.telefon)}</div>
              ${k.adresse ? `<div><strong style="color:#14171C;">Adresse:</strong> ${esc(k.adresse)}</div>` : ''}
              <div><strong style="color:#14171C;">Levering:</strong> ${esc(k.levering)}</div>
            </td></tr>
          </table>
        </td></tr>

        <!-- Velkommen tilbake -->
        <tr><td class="pad" style="padding:22px 30px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="fade" style="background:#F4F8FF;border-radius:18px;">
            <tr><td style="padding:20px 22px;text-align:center;">
              <p style="margin:0 0 6px;font-size:17px;font-weight:800;color:#14171C;">Velkommen tilbake!</p>
              <p style="margin:0;font-size:14px;line-height:1.65;color:#5A6270;">
                Trenger du noe printet, fikset eller designet en annen gang, er det bare å ta kontakt.
                Er du fornøyd, blir vi kjempeglade om du tipser noen andre om oss.
              </p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Bunn -->
        <tr><td class="pad" style="padding:26px 30px 30px;text-align:center;">
          <a href="${esc(k.nettside)}" class="fade" style="display:inline-block;background:#1B8A4B;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:999px;">Bestill noe nytt</a>
          <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#8891A2;">
            ${esc(k.bedrift)} · elevbedrift på Skranevatnet skole<br />
            Spørsmål? Ring eller send melding til ${esc(k.bedriftTelefon)}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const tekst = [
    `Takk for handelen! Bestilling #${k.ordrenr} er ferdig.`,
    '',
    'Dette fikk du:',
    ...k.linjer.map((l) => `- ${l.antall}x ${l.navn} – ${l.pris}`),
    `Å betale: ${k.sum} (${k.betaling})`,
    '',
    `Navn: ${k.kunde}`,
    `Telefon: ${k.telefon}`,
    k.adresse ? `Adresse: ${k.adresse}` : '',
    `Levering: ${k.levering}`,
    '',
    'Velkommen tilbake! Trenger du noe printet, fikset eller designet en annen gang, er det bare å ta kontakt.',
    '',
    k.bedrift,
  ]
    .filter(Boolean)
    .join('\n');

  return { emne: `Takk for handelen – bestilling #${k.ordrenr}`, html, tekst };
}

/**
 * Sender samme e-post til hver mottaker i hver sin sending.
 *
 * Grunnen: med Resend sin testavsender (onboarding@resend.dev) avvises HELE
 * sendingen med 403 hvis bare én av adressene ikke er kontoens egen. Da ville
 * ingen fått noe. Sender vi én og én, kommer den i hvert fall fram til dem den
 * har lov å gå til, og vi ser nøyaktig hvem som feilet.
 */
export async function sendEnkeltvis(opts: {
  til: string[];
  emne: string;
  html: string;
  tekst: string;
  avsender: string;
  svarTil?: string;
}): Promise<{ ok: boolean; sendt: string[]; feilet: { til: string; feil: string }[] }> {
  const resultater = await Promise.all(
    opts.til.map(async (adresse) => ({
      adresse,
      svar: await sendEpost({ ...opts, til: [adresse] }),
    }))
  );

  const sendt = resultater.filter((r) => r.svar.ok).map((r) => r.adresse);
  const feilet = resultater
    .filter((r) => !r.svar.ok)
    .map((r) => ({ til: r.adresse, feil: r.svar.feil ?? 'ukjent' }));

  return { ok: sendt.length > 0, sendt, feilet };
}
