import { Resend } from "resend";

const FROM = "DeVerzekeringsAgent <noreply@deverzkeringsagent.nl>";

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

// ─── Shared template wrapper ───────────────────────────────────────────────

function wrapEmail(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Inter',Arial,sans-serif;color:#1E293B;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#16A34A;border-radius:14px;width:48px;height:48px;text-align:center;vertical-align:middle;">
                    <span style="font-size:22px;line-height:48px;">🛡️</span>
                  </td>
                  <td style="padding-left:12px;">
                    <span style="font-size:20px;font-weight:700;color:#0F172A;letter-spacing:-0.5px;">BespaarWacht</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border-radius:16px;border:1px solid #E2E8F0;box-shadow:0 1px 3px rgba(15,33,55,.05);padding:40px 36px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.6;">
                BespaarWacht &middot; DeVerzekeringsAgent &middot; Nederland<br/>
                Je ontvangt dit bericht omdat je een account hebt aangemaakt bij BespaarWacht.<br/>
                <a href="https://deverzkeringsagent.nl/privacy" style="color:#94A3B8;text-decoration:underline;">Privacybeleid</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── sendVerificationEmail ─────────────────────────────────────────────────

export async function sendVerificationEmail(
  email: string,
  token: string,
  baseUrl: string
): Promise<void> {
  const verifyUrl = `${baseUrl}/api/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  const body = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0F172A;letter-spacing:-0.5px;">
      Bevestig je e-mailadres
    </h1>
    <p style="margin:0 0 28px;font-size:15px;color:#64748B;line-height:1.6;">
      Klik op de knop hieronder om je e-mailadres te bevestigen en in te loggen bij BespaarWacht.
      De link is <strong>1 uur</strong> geldig.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="background:#16A34A;border-radius:10px;">
          <a href="${verifyUrl}"
            style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:10px;letter-spacing:0.1px;">
            E-mailadres bevestigen →
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 6px;font-size:13px;color:#94A3B8;line-height:1.5;">
      Of kopieer en plak de volgende link in je browser:
    </p>
    <p style="margin:0 0 24px;font-size:12px;color:#1A56DB;word-break:break-all;line-height:1.5;">
      ${verifyUrl}
    </p>
    <div style="border-top:1px solid #E2E8F0;padding-top:20px;">
      <p style="margin:0;font-size:13px;color:#94A3B8;line-height:1.5;">
        Als je geen account hebt aangemaakt bij BespaarWacht, kun je deze e-mail negeren.
      </p>
    </div>
  `;

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Bevestig je e-mailadres – BespaarWacht",
    html: wrapEmail("Bevestig je e-mailadres", body),
  });
}

// ─── sendWelcomeEmail ──────────────────────────────────────────────────────

export async function sendWelcomeEmail(
  email: string,
  name?: string
): Promise<void> {
  const greeting = name ? `Welkom, ${name}!` : "Welkom bij BespaarWacht!";

  const body = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0F172A;letter-spacing:-0.5px;">
      ${greeting}
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#64748B;line-height:1.6;">
      Je account is aangemaakt en je e-mailadres is bevestigd. 🎉
    </p>
    <div style="background:#ECFDF5;border:1px solid #BBF7D0;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#166534;">Wat kan BespaarWacht voor je doen?</p>
      <ul style="margin:0;padding-left:18px;font-size:14px;color:#15803D;line-height:1.8;">
        <li>We houden al je verzekeringen en abonnementen bij</li>
        <li>Je krijgt een melding als er een betere deal is</li>
        <li>Upload je polis en we analyseren deze direct</li>
      </ul>
    </div>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr>
        <td style="background:#1A56DB;border-radius:10px;">
          <a href="https://deverzkeringsagent.nl/account"
            style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:10px;">
            Naar mijn account →
          </a>
        </td>
      </tr>
    </table>
  `;

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Welkom bij BespaarWacht! 🛡️",
    html: wrapEmail("Welkom bij BespaarWacht", body),
  });
}

// ─── sendBetterDealEmail ───────────────────────────────────────────────────

export async function sendBetterDealEmail(
  email: string,
  name: string,
  product: string,
  besparing: number
): Promise<void> {
  const besparingFormatted = new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(besparing);

  const body = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0F172A;letter-spacing:-0.5px;">
      We hebben een betere deal gevonden! 💰
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#64748B;line-height:1.6;">
      Hoi ${name}, we hebben een goedkoper alternatief gevonden voor je <strong>${product}</strong>.
    </p>
    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 4px;font-size:14px;color:#64748B;">Mogelijke besparing</p>
      <p style="margin:0;font-size:40px;font-weight:800;color:#1A56DB;letter-spacing:-1px;">${besparingFormatted}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#64748B;">per jaar</p>
    </div>
    <p style="margin:0 0 24px;font-size:15px;color:#64748B;line-height:1.6;">
      Log in op je BespaarWacht account om de alternatieven te bekijken en te vergelijken.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr>
        <td style="background:#F97316;border-radius:10px;">
          <a href="https://deverzkeringsagent.nl/account"
            style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:10px;">
            Bekijk de betere deal →
          </a>
        </td>
      </tr>
    </table>
  `;

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `Bespaar ${besparingFormatted}/jaar op je ${product} – BespaarWacht`,
    html: wrapEmail("Betere deal gevonden", body),
  });
}
