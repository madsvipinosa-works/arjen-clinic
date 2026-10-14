import nodemailer from 'nodemailer';

/**
 * Singleton cached NodeMailer transporter with connection pooling.
 * Prevents rapid connection throttling or handshaking exhaustion against Gmail SMTP.
 */
let cachedTransporter = null;

function getTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });
  }
  return cachedTransporter;
}

/**
 * Strips HTML tags and formats clean plain-text for fallback email clients.
 */
function htmlToPlainText(html) {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<[^>]+>/gi, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n\s+\n/g, '\n\n')
    .trim();
}

/**
 * Renders a standardized, mobile-responsive Magic UI branded HTML email template
 * for AR-JEN Maternity Clinic notifications, reminders, and alerts.
 * 
 * @param {Object} options
 * @param {string} [options.title="AR-JEN Maternity Clinic"]
 * @param {string} [options.subtitle="Dasmariñas City, Cavite · PhilHealth Accredited Lying-In"]
 * @param {string} [options.badgeText]
 * @param {'emerald'|'rose'|'amber'|'teal'|'slate'} [options.badgeVariant='emerald']
 * @param {string} [options.headline]
 * @param {string} [options.message]
 * @param {Array<{label: string, value: string}>} [options.detailsRows=[]]
 * @param {string} [options.ctaText]
 * @param {string} [options.ctaUrl]
 * @param {string} [options.urgentNotice]
 * @param {string} [options.footerNote]
 * @returns {string} Fully styled HTML string
 */
export function renderClinicEmailTemplate({
  title = "AR-JEN Maternity Clinic",
  subtitle = "Dasmariñas City, Cavite · PhilHealth Accredited Lying-In",
  badgeText,
  badgeVariant = "emerald",
  headline,
  message,
  detailsRows = [],
  ctaText,
  ctaUrl,
  urgentNotice,
  footerNote,
}) {
  const badgeColors = {
    emerald: { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857' },
    rose: { bg: '#fff1f2', border: '#ffe4e6', text: '#e11d48' },
    amber: { bg: '#fefce8', border: '#fef08a', text: '#a16207' },
    teal: { bg: '#f0fdfa', border: '#ccfbf1', text: '#0f766e' },
    slate: { bg: '#f8fafc', border: '#e2e8f0', text: '#334155' },
  };

  const activeBadge = badgeColors[badgeVariant] || badgeColors.emerald;

  const renderedRows = detailsRows.map(row => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 10px 0; color: #64748b; font-size: 13px; font-weight: 500; width: 38%; vertical-align: top;">${row.label}</td>
      <td style="padding: 10px 0; color: #0f172a; font-size: 14px; font-weight: 600; vertical-align: top;">${row.value}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline || title}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <!-- Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.03);" border="0" cellspacing="0" cellpadding="0">
          
          <!-- Clinic Branding Header -->
          <tr>
            <td style="padding: 28px 28px 20px 28px; text-align: center; border-bottom: 1px solid #f1f5f9;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <span style="display: inline-block; font-size: 26px; line-height: 1; margin-bottom: 6px;">🏥</span>
                    <h1 style="color: #e11d48; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">${title}</h1>
                    <p style="color: #64748b; font-size: 12px; font-weight: 500; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.05em;">${subtitle}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 28px;">

              ${badgeText ? `
                <div style="margin-bottom: 16px;">
                  <span style="display: inline-block; padding: 5px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background-color: ${activeBadge.bg}; border: 1px solid ${activeBadge.border}; color: ${activeBadge.text};">
                    ${badgeText}
                  </span>
                </div>
              ` : ''}

              ${headline ? `
                <h2 style="color: #0f172a; margin: 0 0 12px 0; font-size: 18px; font-weight: 700; line-height: 1.35;">
                  ${headline}
                </h2>
              ` : ''}

              ${message ? `
                <div style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                  ${message}
                </div>
              ` : ''}

              ${detailsRows.length > 0 ? `
                <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                    <tbody>
                      ${renderedRows}
                    </tbody>
                  </table>
                </div>
              ` : ''}

              ${urgentNotice ? `
                <div style="background-color: #fff1f2; border-left: 4px solid #e11d48; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                  <p style="margin: 0; color: #9f1239; font-size: 13px; font-weight: 600; line-height: 1.5;">
                    ⚠️ ${urgentNotice}
                  </p>
                </div>
              ` : ''}

              ${ctaText && ctaUrl ? `
                <div style="text-align: center; margin: 30px 0 20px 0;">
                  <a href="${ctaUrl}" style="background-color: #e11d48; color: #ffffff; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 9999px; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.25);">
                    ${ctaText} &rarr;
                  </a>
                </div>
              ` : ''}

              ${footerNote ? `
                <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0; text-align: center;">
                  ${footerNote}
                </p>
              ` : ''}

            </td>
          </tr>

          <!-- Statutory & Clinic Contact Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 28px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #334155;">
                AR-JEN Maternity & Lying-In Clinic
              </p>
              <p style="margin: 0 0 8px 0; font-size: 11px; color: #64748b; line-height: 1.4;">
                Dasmariñas City, Cavite · Hotline: (046) 416-XXXX · Mobile: 0912-345-6789
              </p>
              <p style="margin: 0; font-size: 10px; color: #94a3b8; line-height: 1.4;">
                Department of Health (DOH) Licensed Lying-In · PhilHealth Accredited Provider<br/>
                Confidential health communication protected by RA 10173 (Philippine Data Privacy Act).
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Sends an email using NodeMailer and Gmail SMTP with connection pooling.
 * Requires EMAIL_USER and EMAIL_APP_PASSWORD in .env.local
 * 
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content of the email
 * @param {string} [options.text] - Plain text content (auto-generated from HTML if omitted)
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.warn('[Email System] ⚠️ EMAIL_USER or EMAIL_APP_PASSWORD not set. Skipping email dispatch.');
    return { success: false, error: 'Credentials not configured' };
  }

  if (!to) {
    return { success: false, error: 'Recipient email is missing' };
  }

  try {
    const transporter = getTransporter();
    const plainText = text || htmlToPlainText(html);

    const info = await transporter.sendMail({
      from: `"AR-JEN Maternity Clinic" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: plainText,
    });

    console.log(`[Email System] Message sent successfully to ${to}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email System] Failed to send email to ${to}:`, error);
    return { success: false, error: error.message };
  }
}
