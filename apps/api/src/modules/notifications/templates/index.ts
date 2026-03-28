import { Payment, Invoice, Payout } from '../types';

export const verificationTemplate = (token: string) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
    <h2>Verify your email</h2>
    <p>Please click the button below to verify your email address.</p>
    <a href="https://useroutr.internal/verify?token=${token}" 
       style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
      Verify Email
    </a>
  </div>
`;

export const passwordResetTemplate = (token: string) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
    <h2>Reset Password</h2>
    <p>Click below to reset your password:</p>
    <a href="https://useroutr.internal/reset?token=${token}"
       style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
      Reset Password
    </a>
  </div>
`;

export const teamInviteTemplate = (
  merchantName: string,
  inviteLink: string,
) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
    <h2>You've been invited!</h2>
    <p>You have been invited to join the team at <strong>${merchantName}</strong>.</p>
    <a href="${inviteLink}"
       style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
      Accept Invitation
    </a>
  </div>
`;

export const paymentReceiptTemplate = (payment: Payment) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
    <h2>Payment Receipt</h2>
    <p>Amount: ${payment.amount} ${payment.currency}</p>
    <p>Merchant: ${payment.merchantName}</p>
    <p>Reference: ${payment.reference || payment.id}</p>
    <p>Date: ${payment.date.toISOString()}</p>
  </div>
`;

export const invoiceTemplate = (invoice: Invoice) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
    <h2>Invoice ${invoice.id}</h2>
    <p>Amount Due: ${invoice.amount} ${invoice.currency}</p>
    <p>Due Date: ${invoice.dueDate.toISOString()}</p>
    <p>Reference: ${invoice.reference || invoice.id}</p>
    <br/>
    <a href="https://useroutr.internal/pay/${invoice.id}"
       style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
      Pay Now
    </a>
    <p>See attached PDF for full details.</p>
  </div>
`;

export const invoiceReminderTemplate = (invoice: Invoice) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
    <h2>Invoice Reminder</h2>
    <p>Your invoice is due in 3 days.</p>
    <p>Invoice ID: ${invoice.id}</p>
    <p>Amount: ${invoice.amount} ${invoice.currency}</p>
  </div>
`;

export const payoutConfirmationTemplate = (payout: Payout) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
    <h2>Payout Confirmation</h2>
    <p>Amount: ${payout.amount} ${payout.currency}</p>
    <p>Destination: ${payout.destination}</p>
    <p>Status: ${payout.status}</p>
  </div>
`;
