import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailJobData } from './types';

@Processor('notifications', {
  concurrency: 5,
})
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);
  private resend: Resend;
  private fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    super();

    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      throw new Error(
        'RESEND_API_KEY is not configured. Set it in your environment variables.',
      );
    }

    this.resend = new Resend(apiKey);
    this.fromEmail = this.configService.get<string>(
      'EMAIL_FROM',
      'noreply@useroutr.io',
    );
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    switch (job.name) {
      case 'sendEmail': {
        const { to, subject, html, attachments } = job.data;
        const toString = Array.isArray(to) ? to.join(', ') : to;

        try {
          this.logger.debug(`Sending email to ${toString}`);

          const response = await this.resend.emails.send({
            from: this.fromEmail,
            to: typeof to === 'string' ? [to] : to,
            subject,
            html,
            ...(attachments?.length ? { attachments } : {}),
          });

          if (response.error) {
            this.logger.error(
              `Resend rejected email to ${toString}: ${JSON.stringify(response.error)}`,
            );
            throw new Error(response.error.message);
          }

          this.logger.log(
            `Email accepted by Resend — id: ${response.data?.id}, to: ${toString}, from: ${this.fromEmail}, subject: "${subject}"`,
          );
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
