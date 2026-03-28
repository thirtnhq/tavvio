import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { NotificationsService } from './notifications.service';
import { EmailJobData } from './types';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let queueMock: { add: jest.Mock };

  const APP_URL = 'https://app.useroutr.io';

  beforeEach(async () => {
    queueMock = {
      add: jest.fn().mockResolvedValue({ id: 'job-id' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getQueueToken('notifications'),
          useValue: queueMock as unknown as Queue<EmailJobData>,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                FRONTEND_URL: APP_URL,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationEmail', () => {
    it('should enqueue a job with correct data and use FRONTEND_URL', async () => {
      await service.sendVerificationEmail('test@example.com', 'dummy-token');

      expect(queueMock.add).toHaveBeenCalledWith(
        'sendEmail',
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Verify your email',
          html: expect.stringContaining(APP_URL) as string,
        }),
        expect.objectContaining({
          attempts: 3,
        }),
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should use FRONTEND_URL for reset link', async () => {
      await service.sendPasswordResetEmail('test@example.com', 'reset-token');

      expect(queueMock.add).toHaveBeenCalledWith(
        'sendEmail',
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Reset your password',
          html: expect.stringContaining(
            `${APP_URL}/reset?token=reset-token`,
          ) as string,
        }),
        expect.any(Object),
      );
    });
  });

  describe('sendTeamInvite', () => {
    it('should enqueue a team invite email with escaped merchant name', async () => {
      await service.sendTeamInvite(
        'invitee@example.com',
        'Test <Merchant>',
        'https://link',
      );

      expect(queueMock.add).toHaveBeenCalledWith(
        'sendEmail',
        expect.objectContaining({
          to: 'invitee@example.com',
          subject: expect.stringContaining('Test <Merchant>') as string,
          html: expect.stringContaining('Test &lt;Merchant&gt;') as string,
        }),
        expect.any(Object),
      );
    });
  });

  describe('sendPaymentReceipt', () => {
    it('should enqueue payment receipt email for customer', async () => {
      const payment = {
        id: 'pay_123',
        amount: 100,
        currency: 'USDC',
        date: new Date('2026-03-28T12:00:00Z'),
        merchantName: 'Test Merchant',
      };
      await service.sendPaymentReceipt('customer@example.com', payment);

      expect(queueMock.add).toHaveBeenCalledWith(
        'sendEmail',
        expect.objectContaining({
          to: 'customer@example.com',
          subject: 'Payment Receipt for Test Merchant',
          html: expect.stringContaining('Payment Receipt') as string,
        }),
        expect.any(Object),
      );
    });
  });

  describe('sendPaymentNotification', () => {
    it('should use merchant-specific template, not the customer receipt', async () => {
      const payment = {
        id: 'pay_456',
        amount: 250,
        currency: 'USD',
        date: new Date('2026-03-28T12:00:00Z'),
        merchantName: 'Merchant Co',
      };
      await service.sendPaymentNotification('merchant@example.com', payment);

      expect(queueMock.add).toHaveBeenCalledWith(
        'sendEmail',
        expect.objectContaining({
          to: 'merchant@example.com',
          subject: 'New Payment Received',
          html: expect.stringContaining('New Payment Received') as string,
        }),
        expect.any(Object),
      );

      // Ensure it uses the merchant template, not the customer receipt
      const callArgs = queueMock.add.mock.calls[0] as [
        string,
        EmailJobData,
        unknown,
      ];
      const html = callArgs[1].html;
      expect(html).toContain('You received a payment');
      expect(html).not.toContain('Your payment to');
    });
  });

  describe('sendInvoice', () => {
    it('should include attachment and use FRONTEND_URL for pay link', async () => {
      const invoice = {
        id: 'inv_789',
        amount: 500,
        currency: 'USD',
        dueDate: new Date('2026-04-15T00:00:00Z'),
      };
      await service.sendInvoice(
        'customer@example.com',
        invoice,
        'https://storage.example.com/invoice.pdf',
      );

      expect(queueMock.add).toHaveBeenCalledWith(
        'sendEmail',
        expect.objectContaining({
          to: 'customer@example.com',
          subject: 'Invoice inv_789 is available',
          html: expect.stringContaining(`${APP_URL}/pay/inv_789`) as string,
          attachments: [
            {
              filename: 'invoice-inv_789.pdf',
              path: 'https://storage.example.com/invoice.pdf',
            },
          ],
        }),
        expect.any(Object),
      );
    });
  });

  describe('sendInvoiceReminder', () => {
    it('should compute dynamic due label for near-future dates', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const invoice = {
        id: 'inv_remind',
        amount: 100,
        currency: 'USD',
        dueDate: tomorrow,
      };
      await service.sendInvoiceReminder('customer@example.com', invoice);

      expect(queueMock.add).toHaveBeenCalledWith(
        'sendEmail',
        expect.objectContaining({
          subject: 'Your invoice is due tomorrow',
        }),
        expect.any(Object),
      );
    });

    it('should say overdue for past-due invoices', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const invoice = {
        id: 'inv_overdue',
        amount: 100,
        currency: 'USD',
        dueDate: yesterday,
      };
      await service.sendInvoiceReminder('customer@example.com', invoice);

      expect(queueMock.add).toHaveBeenCalledWith(
        'sendEmail',
        expect.objectContaining({
          subject: 'Your invoice is overdue',
        }),
        expect.any(Object),
      );
    });
  });
});
