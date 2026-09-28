import nodemailer from 'nodemailer';

/**
 * Sends an email using NodeMailer and Gmail SMTP.
 * Requires EMAIL_USER and EMAIL_APP_PASSWORD in .env.local
 * 
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content of the email
 */
export async function sendEmail({ to, subject, html }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.warn('⚠️ EMAIL_USER or EMAIL_APP_PASSWORD not set in environment. Skipping email dispatch.');
    return { success: false, error: 'Credentials not configured' };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: `"AR-JEN Clinic" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`[Email System] Message sent successfully to ${to}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email System] Failed to send email:', error);
    return { success: false, error: error.message };
  }
}
