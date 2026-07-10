import { Resend } from 'resend';

export type InviteEmailStatus = 'sent' | 'failed' | 'skipped';

interface InviteEmailParams {
  to: string;
  code: string;
  expiresAt: string;
  locale: string;
}

function buildInviteEmail({ code, expiresAt, locale }: InviteEmailParams) {
  const isEn = locale === 'en';
  const expires = new Intl.DateTimeFormat(isEn ? 'en' : 'fr', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(expiresAt));

  const subject = isEn
    ? 'Your UMi access code'
    : "Votre code d'accès UMi";

  const intro = isEn
    ? 'Your practitioner is inviting you to the UMi app. Create your account in the app, then enter the code below to get started.'
    : "Votre praticien vous invite sur l'app UMi. Créez votre compte dans l'app, puis saisissez le code ci-dessous pour commencer.";

  const expiryLine = isEn
    ? `This code expires on ${expires}.`
    : `Ce code expire le ${expires}.`;

  const text = `${intro}\n\n${code}\n\n${expiryLine}`;

  const html = `<!doctype html>
<html lang="${isEn ? 'en' : 'fr'}">
  <body style="margin:0;background:#f5f5f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#171717;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid #e5e5e5;font-size:18px;font-weight:600;color:#27796e;">UMi</td>
            </tr>
            <tr>
              <td style="padding:24px 28px;font-size:14px;line-height:1.6;">
                <p style="margin:0 0 20px;">${intro}</p>
                <div style="text-align:center;margin:24px 0;">
                  <span style="display:inline-block;padding:14px 20px;border:1px solid #e5e5e5;border-radius:8px;background:#e5fbf7;font-size:24px;font-weight:700;letter-spacing:2px;color:#27796e;">${code}</span>
                </div>
                <p style="margin:0;color:#737373;font-size:13px;">${expiryLine}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}

/**
 * Sends the invitation code via Resend. Fails gracefully:
 * - returns 'skipped' when the API key / sender is not configured,
 * - returns 'failed' on any send error (the caller keeps showing the code).
 */
export async function sendInviteEmail(
  params: InviteEmailParams,
): Promise<InviteEmailStatus> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) return 'skipped';

  try {
    const resend = new Resend(apiKey);
    const { subject, html, text } = buildInviteEmail(params);
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject,
      html,
      text,
    });
    return error ? 'failed' : 'sent';
  } catch {
    return 'failed';
  }
}
