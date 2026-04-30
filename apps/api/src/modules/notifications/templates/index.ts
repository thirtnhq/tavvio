import { Payment, Invoice, Payout } from '../types';

/** Escape HTML entities in user-provided values to prevent XSS */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Format a currency amount for display */
function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${esc(currency)}`;
}

/** Compute human-readable days until a date */
function daysUntil(date: Date): string {
  const now = new Date();
  const diff = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff <= 0) return 'today';
  if (diff === 1) return 'in 1 day';
  return `in ${diff} days`;
}

/** Shared email layout wrapper with Useroutr branding */
function layout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #000000; padding: 24px 32px; text-align: center;">
              <span style="color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">Useroutr</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #e4e4e7; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #71717a;">
                Powered by <strong>Useroutr</strong> — Fast, secure payments.
              </p>
              <p style="margin: 0; font-size: 11px; color: #a1a1aa;">
                &copy; ${new Date().getFullYear()} Useroutr. All rights reserved.
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

/** Primary CTA button */
function button(label: string, href: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
  <tr>
    <td style="background-color: #000000; border-radius: 6px; padding: 12px 28px;">
      <a href="${esc(href)}" style="color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
        ${label}
      </a>
    </td>
  </tr>
</table>`;
}

// ── Templates ────────────────────────────────────────────────────────

export const verificationTemplate = (token: string, appUrl: string) =>
  layout(`
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #18181b;">Verify your email</h2>
    <p style="margin: 0 0 8px; font-size: 14px; color: #3f3f46; line-height: 1.6;">
      Please click the button below to verify your email address and complete your account setup.
    </p>
    ${button('Verify Email', `${appUrl}/verify?token=${encodeURIComponent(token)}`)}
    <p style="margin: 0; font-size: 12px; color: #71717a;">
      If you didn't create an account, you can safely ignore this email.
    </p>
  `);

export const verificationCodeTemplate = (code: string, appUrl: string) =>
  layout(`
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #18181b;">Verify your email</h2>
    <p style="margin: 0 0 16px; font-size: 14px; color: #3f3f46; line-height: 1.6;">
      Enter this 6-digit code on the verification page to finish setting up your account:
    </p>
    <div style="margin: 24px 0; padding: 20px; background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; text-align: center;">
      <span style="font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 30px; letter-spacing: 8px; font-weight: 700; color: #18181b;">${esc(code)}</span>
    </div>
    <p style="margin: 0 0 8px; font-size: 13px; color: #3f3f46;">
      Or open <a href="${esc(appUrl)}/verify" style="color: #18181b;">${esc(appUrl)}/verify</a> directly.
    </p>
    <p style="margin: 0; font-size: 12px; color: #71717a;">
      This code expires in 15 minutes. If you didn't create an account, you can safely ignore this email.
    </p>
  `);

export const passwordResetTemplate = (token: string, appUrl: string) =>
  layout(`
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #18181b;">Reset your password</h2>
    <p style="margin: 0 0 8px; font-size: 14px; color: #3f3f46; line-height: 1.6;">
      We received a request to reset your password. Click the button below to choose a new one.
    </p>
    ${button('Reset Password', `${appUrl}/reset-password?token=${encodeURIComponent(token)}`)}
    <p style="margin: 0; font-size: 12px; color: #71717a;">
      This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
    </p>
  `);

export const teamInviteTemplate = (merchantName: string, inviteLink: string) =>
  layout(`
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #18181b;">You've been invited!</h2>
    <p style="margin: 0 0 8px; font-size: 14px; color: #3f3f46; line-height: 1.6;">
      You have been invited to join the team at <strong>${esc(merchantName)}</strong>.
    </p>
    ${button('Accept Invitation', inviteLink)}
    <p style="margin: 0; font-size: 12px; color: #71717a;">
      If you weren't expecting this invitation, you can safely ignore this email.
    </p>
  `);

export const paymentReceiptTemplate = (payment: Payment) =>
  layout(`
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #18181b;">Payment Receipt</h2>
    <p style="margin: 0 0 16px; font-size: 14px; color: #3f3f46; line-height: 1.6;">
      Your payment to <strong>${esc(payment.merchantName)}</strong> was successful.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
      <tr><td style="padding: 8px 16px; font-size: 13px; color: #71717a;">Amount</td>
          <td style="padding: 8px 16px; font-size: 13px; color: #18181b; text-align: right; font-weight: 600;">${formatAmount(payment.amount, payment.currency)}</td></tr>
      <tr><td style="padding: 8px 16px; font-size: 13px; color: #71717a;">Merchant</td>
          <td style="padding: 8px 16px; font-size: 13px; color: #18181b; text-align: right;">${esc(payment.merchantName)}</td></tr>
      <tr><td style="padding: 8px 16px; font-size: 13px; color: #71717a;">Reference</td>
          <td style="padding: 8px 16px; font-size: 13px; color: #18181b; text-align: right;">${esc(payment.reference || payment.id)}</td></tr>
      <tr><td style="padding: 8px 16px; font-size: 13px; color: #71717a;">Date</td>
          <td style="padding: 8px 16px; font-size: 13px; color: #18181b; text-align: right;">${payment.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
    </table>
  `);

export const merchantPaymentNotificationTemplate = (payment: Payment) =>
  layout(`
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #18181b;">New Payment Received</h2>
    <p style="margin: 0 0 16px; font-size: 14px; color: #3f3f46; line-height: 1.6;">
      You received a payment of <strong>${formatAmount(payment.amount, payment.currency)}</strong>.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
      <tr><td style="padding: 8px 16px; font-size: 13px; color: #71717a;">Amount</td>
          <td style="padding: 8px 16px; font-size: 13px; color: #18181b; text-align: right; font-weight: 600;">${formatAmount(payment.amount, payment.currency)}</td></tr>
      <tr><td style="padding: 8px 16px; font-size: 13px; color: #71717a;">Reference</td>
          <td style="padding: 8px 16px; font-size: 13px; color: #18181b; text-align: right;">${esc(payment.reference || payment.id)}</td></tr>
      <tr><td style="padding: 8px 16px; font-size: 13px; color: #71717a;">Date</td>
          <td style="padding: 8px 16px; font-size: 13px; color: #18181b; text-align: right;">${payment.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
    </table>
    <p style="margin: 0; font-size: 12px; color: #71717a;">
      Log in to your Useroutr dashboard for full details.
    </p>
  `);

export const invoiceTemplate = (invoice: Invoice, appUrl: string) => {
  const brand = invoice.merchantBrandColor ?? '#000000';
  const payUrl = invoice.checkoutUrl ?? `${appUrl}/pay/${encodeURIComponent(invoice.id)}`;
  const ctaButton = `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
  <tr>
    <td style="background-color: ${esc(brand)}; border-radius: 6px; padding: 12px 28px;">
      <a href="${esc(payUrl)}" style="color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
        Pay Now
      </a>
    </td>
  </tr>
</table>`;

  const pixel = invoice.trackingPixelUrl
    ? `<img src="${esc(invoice.trackingPixelUrl)}" width="1" height="1" style="display:block;border:0;" alt="" />`
    : '';

  const fromLine = invoice.merchantName
    ? `<p style="margin: 0 0 16px; font-size: 14px; color: #3f3f46;">
        You have a new invoice from <strong>${esc(invoice.merchantName)}</strong>.
        ${invoice.merchantEmail ? `Questions? Reply to <a href="mailto:${esc(invoice.merchantEmail)}">${esc(invoice.merchantEmail)}</a>.` : ''}
      </p>`
    : `<p style="margin: 0 0 16px; font-size: 14px; color: #3f3f46;">You have a new invoice. Please review the details below.</p>`;

  const greeting = invoice.customerName
    ? `<p style="margin: 0 0 16px; font-size: 14px; color: #3f3f46;">Hi <strong>${esc(invoice.customerName)}</strong>,</p>`
    : '';

  const customMessage = invoice.message
    ? `<p style="margin: 0 0 16px; font-size: 14px; color: #3f3f46; line-height: 1.6; padding: 12px 16px; background: #f4f4f5; border-radius: 6px; border-left: 3px solid ${esc(brand)};">
        ${esc(invoice.message)}
      </p>`
    : '';

  const logoHtml = invoice.merchantLogo
    ? `<img src="${esc(invoice.merchantLogo)}" alt="${esc(invoice.merchantName ?? '')}" style="height:40px;width:auto;object-fit:contain;margin-bottom:4px;" />`
    : '';

  return layout(`
    ${logoHtml}
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #18181b;">Invoice #${esc(invoice.reference ?? invoice.id)}</h2>
    ${greeting}
    ${fromLine}
    ${customMessage}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
      <tr><td style="padding: 8px 16px; font-size: 13px; color: #71717a;">Amount Due</td>
          <td style="padding: 8px 16px; font-size: 13px; color: #18181b; text-align: right; font-weight: 600;">${formatAmount(invoice.amount, invoice.currency)}</td></tr>
      <tr><td style="padding: 8px 16px; font-size: 13px; color: #71717a;">Due Date</td>
          <td style="padding: 8px 16px; font-size: 13px; color: #18181b; text-align: right;">${invoice.dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
      <tr><td style="padding: 8px 16px; font-size: 13px; color: #71717a;">Reference</td>
          <td style="padding: 8px 16px; font-size: 13px; color: #18181b; text-align: right;">${esc(invoice.reference ?? invoice.id)}</td></tr>
    </table>
    ${ctaButton}
    ${pixel}
  `);
};

export const invoiceReminderTemplate = (invoice: Invoice, appUrl: string) => {
  const brand = invoice.merchantBrandColor ?? '#000000';
  const payUrl = invoice.checkoutUrl ?? `${appUrl}/pay/${encodeURIComponent(invoice.id)}`;
  const ctaButton = `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
  <tr>
    <td style="background-color: ${esc(brand)}; border-radius: 6px; padding: 12px 28px;">
      <a href="${esc(payUrl)}" style="color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
        Pay Now
      </a>
    </td>
  </tr>
</table>`;

  const now = new Date();
  const isOverdue = invoice.dueDate < now;
  const dueLabelColor = isOverdue ? '#dc2626' : '#18181b';
  const dueLabel = isOverdue ? 'overdue' : daysUntil(invoice.dueDate);

  const fromLine = invoice.merchantName
    ? `<p style="margin: 0 0 16px; font-size: 14px; color: #3f3f46;">
        This is a reminder from <strong>${esc(invoice.merchantName)}</strong>.
      </p>`
    : '';

  const logoHtml = invoice.merchantLogo
    ? `<img src="${esc(invoice.merchantLogo)}" alt="${esc(invoice.merchantName ?? '')}" style="height:40px;width:auto;object-fit:contain;margin-bottom:4px;" />`
    : '';

  return layout(`
    ${logoHtml}
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #18181b;">Invoice Reminder</h2>
    ${fromLine}
    <p style="margin: 0 0 16px; font-size: 14px; color: #3f3f46; line-height: 1.6;">
      Your invoice <strong>${esc(invoice.reference ?? invoice.id)}</strong> for
      <strong>${formatAmount(invoice.amount, invoice.currency)}</strong> is
      <strong style="color: ${dueLabelColor};">${esc(dueLabel)}</strong>.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
      <tr><td style="padding: 8px 16px; font-size: 13px; color: #71717a;">Reference</td>
          <td style="padding: 8px 16px; font-size: 13px; color: #18181b; text-align: right;">${esc(invoice.reference ?? invoice.id)}</td></tr>
      <tr><td style="padding: 8px 16px; font-size: 13px; color: #71717a;">Amount</td>
          <td style="padding: 8px 16px; font-size: 13px; color: #18181b; text-align: right; font-weight: 600;">${formatAmount(invoice.amount, invoice.currency)}</td></tr>
      <tr><td style="padding: 8px 16px; font-size: 13px; color: #71717a;">Due Date</td>
          <td style="padding: 8px 16px; font-size: 13px; color: ${dueLabelColor}; text-align: right; font-weight: 600;">${invoice.dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
    </table>
    ${ctaButton}
  `);
};

export const payoutConfirmationTemplate = (payout: Payout) =>
  layout(`
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #18181b;">Payout Confirmation</h2>
    <p style="margin: 0 0 16px; font-size: 14px; color: #3f3f46; line-height: 1.6;">
      Your payout has been processed successfully.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
      <tr><td style="padding: 8px 16px; font-size: 13px; color: #71717a;">Amount</td>
          <td style="padding: 8px 16px; font-size: 13px; color: #18181b; text-align: right; font-weight: 600;">${formatAmount(payout.amount, payout.currency)}</td></tr>
      <tr><td style="padding: 8px 16px; font-size: 13px; color: #71717a;">Destination</td>
          <td style="padding: 8px 16px; font-size: 13px; color: #18181b; text-align: right;">${esc(payout.destination)}</td></tr>
      <tr><td style="padding: 8px 16px; font-size: 13px; color: #71717a;">Status</td>
          <td style="padding: 8px 16px; font-size: 13px; color: #18181b; text-align: right;">${esc(payout.status)}</td></tr>
    </table>
  `);
