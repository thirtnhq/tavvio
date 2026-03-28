import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EmailJobData, Invoice, Payment, Payout } from './types';
import * as templates from './templates';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectQueue('notifications')
    private readonly notificationsQueue: Queue<EmailJobData>,
  ) {}

  private async dispatch(data: EmailJobData) {
    if (!data.subject || !data.to || !data.html) {
      throw new Error('Missing required email data');
    }

    await this.notificationsQueue.add('sendEmail', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  // Auth emails
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    await this.dispatch({
      to: email,
      subject: 'Verify your email',
      html: templates.verificationTemplate(token),
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    await this.dispatch({
      to: email,
      subject: 'Reset your password',
      html: templates.passwordResetTemplate(token),
    });
  }

  // Team
  async sendTeamInvite(
    email: string,
    merchantName: string,
    inviteLink: string,
  ): Promise<void> {
    await this.dispatch({
      to: email,
      subject: `You've been invited to ${merchantName}`,
      html: templates.teamInviteTemplate(merchantName, inviteLink),
    });
  }

  // Payments
  async sendPaymentReceipt(
    customerEmail: string,
    payment: Payment,
  ): Promise<void> {
    await this.dispatch({
      to: customerEmail,
      subject: `Payment Receipt for ${payment.merchantName}`,
      html: templates.paymentReceiptTemplate(payment),
    });
  }

  async sendPaymentNotification(
    merchantEmail: string,
    payment: Payment,
  ): Promise<void> {
    await this.dispatch({
      to: merchantEmail,
      subject: 'New Payment Received',
      html: templates.paymentReceiptTemplate(payment),
    });
  }

  // Invoices
  async sendInvoice(
    customerEmail: string,
    invoice: Invoice,
    pdfUrl: string,
  ): Promise<void> {
    // Ideally we would fetch the PDF and attach it, but relying on external URL attachment
    // or dropping a link in the email can bypass needing complex buffers here.
    // Assuming attachment is a base64 or buff. In this simple mock, we just link it.
    await this.dispatch({
      to: customerEmail,
      subject: `Invoice ${invoice.id} is available`,
      html:
        templates.invoiceTemplate(invoice) +
        `<p><a href="${pdfUrl}">Download PDF</a></p>`,
    });
  }

  async sendInvoiceReminder(
    customerEmail: string,
    invoice: Invoice,
  ): Promise<void> {
    await this.dispatch({
      to: customerEmail,
      subject: 'Your invoice is due in 3 days',
      html: templates.invoiceReminderTemplate(invoice),
    });
  }

  // Payouts
  async sendPayoutConfirmation(
    merchantEmail: string,
    payout: Payout,
  ): Promise<void> {
    await this.dispatch({
      to: merchantEmail,
      subject: 'Payout Confirmation',
      html: templates.payoutConfirmationTemplate(payout),
    });
  }
}
