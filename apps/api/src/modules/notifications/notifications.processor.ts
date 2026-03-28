import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { EmailJobData } from './types';

@Processor('notifications', {
  concurrency: 5,
})
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);
  private resend: Resend;

  constructor() {
    super();
    // Use the RESEND_API_KEY from environment, though normally you inject ConfigService
    this.resend = new Resend(process.env.RESEND_API_KEY || 're_mock');
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    switch (job.name) {
      case 'sendEmail': {
        const { to, subject, html } = job.data;
        const fromEmail = process.env.EMAIL_FROM || 'noreply@useroutr.io';
        const toString = Array.isArray(to) ? to.join(', ') : to;

        try {
          this.logger.debug(`Sending email to ${toString}`);

          const response = await this.resend.emails.send({
            from: fromEmail,
            to: typeof to === 'string' ? [to] : to,
            subject,
            html,
          });

          if (response.error) {
            this.logger.error(
              `Failed to send email to ${toString}: ${response.error.message}`,
            );
            throw new Error(response.error.message);
          }

          this.logger.log(`Successfully sent email to ${toString}`);
        } catch (error: unknown) {
          const errMsg =
            error instanceof Error ? error.message : 'Unknown error';
          const errStack = error instanceof Error ? error.stack : undefined;
          this.logger.error(
            `Error processing sendEmail job: ${errMsg}`,
            errStack,
          );
          throw error; // Will automatically trigger BullMQ retry backoff
        }
        break;
      }
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }
}
