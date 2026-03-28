import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { EmailJobData, Invoice, Payment, Payout } from './types';
import * as templates from './templates';

@Injectable()
export class NotificationsService {
  private readonly appUrl: string;

  constructor(
    @InjectQueue('notifications')
    private readonly notificationsQueue: Queue<EmailJobData>,
    private readonly configService: ConfigService,
  ) {
    this.appUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3001',
    );
  }

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
      html: templates.verificationTemplate(token, this.appUrl),
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    await this.dispatch({
      to: email,
      subject: 'Reset your password',
      html: templates.passwordResetTemplate(token, this.appUrl),
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
      html: templates.merchantPaymentNotificationTemplate(payment),
    });
  }

  // Invoices
  async sendInvoice(
    customerEmail: string,
    invoice: Invoice,
    pdfUrl: string,
  ): Promise<void> {
    await this.dispatch({
      to: customerEmail,
      subject: `Invoice ${invoice.id} is available`,
      html: templates.invoiceTemplate(invoice, this.appUrl),
      attachments: [
        {
          filename: `invoice-${invoice.id}.pdf`,
          path: pdfUrl,
        },
      ],
    });
  }

  async sendInvoiceReminder(
    customerEmail: string,
    invoice: Invoice,
  ): Promise<void> {
    const now = new Date();
    const diff = Math.ceil(
      (invoice.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    const dueLabel =
      diff <= 0
        ? 'overdue'
        : diff === 1
          ? 'due tomorrow'
          : `due in ${diff} days`;

    await this.dispatch({
      to: customerEmail,
      subject: `Your invoice is ${dueLabel}`,
      html: templates.invoiceReminderTemplate(invoice, this.appUrl),
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
