import { Resend } from 'resend';

export type InviteEmailStatus = 'sent' | 'failed' | 'skipped';

interface InviteEmailParams {
  to: string;
  code: string;
  expiresAt: string;
  locale: string;
  link?: string;
  practitionerName?: string | null;
}

function buildInviteEmail({ code, expiresAt, locale, link, practitionerName }: InviteEmailParams) {
  const isEn = locale === 'en';
  const expires = new Intl.DateTimeFormat(isEn ? 'en' : 'fr', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(expiresAt));

  const subject = isEn
    ? 'Your invitation to join UMi'
    : 'Ton invitation à rejoindre UMi';

  const psyDisplay = practitionerName?.trim() ? practitionerName.trim() : (isEn ? 'your psychologist' : 'ton praticien');

  const intro = isEn
    ? `${psyDisplay} invites you to connect on the UMi app to accompany you between sessions.`
    : `${psyDisplay} t'invite à le retrouver sur l'application UMi pour t'accompagner entre vos séances.`;

  const btnText = isEn ? 'Join my practitioner' : 'Rejoindre mon psy';
  const orCode = isEn
    ? 'Or enter your 4-digit invitation code in the app:'
    : 'Ou saisis directement ton code à 4 chiffres dans l’application :';

  const expiryLine = isEn
    ? `This invitation expires on ${expires}.`
    : `Cette invitation expire le ${expires}.`;

  const actionLink = link || `https://umi-portail.netlify.app/join?code=${code}`;

  const text = `${intro}\n\n${btnText}: ${actionLink}\n\n${orCode} ${code}\n\n${expiryLine}`;

  const html = `<!doctype html>
<html lang="${isEn ? 'en' : 'fr'}">
  <body style="margin:0;background:#f5f5f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#171717;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid #e5e5e5;font-size:20px;font-weight:700;color:#27796e;background:#f9fbfb;">
                UMi
              </td>
            </tr>
            <tr>
              <td style="padding:28px;font-size:14px;line-height:1.6;">
                <p style="margin:0 0 20px;font-size:15px;color:#333;">${intro}</p>
                
                <div style="text-align:center;margin:28px 0;">
                  <a href="${actionLink}" style="display:inline-block;padding:14px 28px;background:#27796e;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 2px 4px rgba(39,121,110,0.2);">
                    ${btnText}
                  </a>
                </div>

                <div style="background:#f4fbf9;border:1px dashed #bce2dc;border-radius:8px;padding:14px;text-align:center;margin:24px 0;">
                  <p style="margin:0 0 6px;font-size:12px;color:#666;">${orCode}</p>
                  <span style="font-size:26px;font-weight:700;letter-spacing:4px;color:#27796e;font-family:monospace;">${code}</span>
                </div>

                <p style="margin:20px 0 0;color:#888;font-size:12px;text-align:center;">${expiryLine}</p>
                <p style="margin:10px 0 0;color:#aaa;font-size:11px;word-break:break-all;text-align:center;">Lien de secours : ${actionLink}</p>
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
