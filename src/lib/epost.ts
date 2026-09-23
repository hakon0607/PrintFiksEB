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
            Vi har fått bestillingen din og tar kontakt så fort vi kan – på telefon eller melding –
            for å avtale detaljene og om vi trenger å møtes eller måle opp noe.
            <strong style="color:#14171C;">Du får en endelig pris som du må godkjenne før vi starter å printe.</strong>
          </p>
        </td></tr>

        <!-- Stegene -->
        <tr><td class="pad" style="padding:20px 30px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="fade" style="background:#F6F8FC;border-radius:18px;">
            <tr>
              <td style="padding:16px 18px;font-size:13px;line-height:1.5;color:#3D4453;">
                <div style="margin-bottom:8px;"><strong style="color:#2559C7;">1.</strong> Vi tar kontakt og avtaler detaljer</div>
                <div style="margin-bottom:8px;"><strong style="color:#2559C7;">2.</strong> Du får endelig pris og godkjenner den</div>
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
            Dette er et estimat. Endelig pris får du fra oss før vi starter.
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
    'Vi tar kontakt så fort vi kan for å avtale detaljene.',
    'Du får en endelig pris som du må godkjenne før vi starter å printe.',
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
        <p style="margin:18px 0 0;font-size:13px;color:#697285;">Husk å ringe kunden og sende endelig pris til godkjenning.</p>
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

export function harEpostOppsett(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEpost(opts: {
  til: string[];
  emne: string;
  html: string;
  tekst: string;
  avsender: string;
  svarTil?: string;
}): Promise<{ ok: boolean; feil?: string }> {
  const nokkel = process.env.RESEND_API_KEY;
  if (!nokkel) return { ok: false, feil: 'Mangler RESEND_API_KEY' };

  const mottakere = opts.til.map((t) => t.trim()).filter(Boolean);
  if (mottakere.length === 0) return { ok: false, feil: 'Ingen mottakere' };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${nokkel}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: opts.avsender || 'PrintFiksEB <onboarding@resend.dev>',
        to: mottakere,
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
