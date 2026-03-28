import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let queueMock: any;

  beforeEach(async () => {
    queueMock = {
      add: jest.fn().mockResolvedValue({ id: 'job-id' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getQueueToken('notifications'),
          useValue: queueMock,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationEmail', () => {
    it('should enqueue a job with correct data and formatting', async () => {
      await service.sendVerificationEmail('test@example.com', 'dummy-token');

      expect(queueMock.add).toHaveBeenCalledWith(
        'sendEmail',
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Verify your email',
          html: expect.stringContaining('dummy-token'),
        }),
        expect.objectContaining({
          attempts: 3,
        }),
      );
    });
  });

  describe('sendTeamInvite', () => {
    it('should enqueue a team invite email', async () => {
      await service.sendTeamInvite(
        'invitee@example.com',
        'Test Merchant',
        'https://link',
      );

      expect(queueMock.add).toHaveBeenCalledWith(
        'sendEmail',
        expect.objectContaining({
          to: 'invitee@example.com',
          subject: expect.stringContaining('Test Merchant'),
          html: expect.stringContaining('https://link'),
        }),
        expect.any(Object),
      );
    });
  });

  describe('sendPaymentReceipt', () => {
    it('should enqueue payment receipt email', async () => {
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
          html: expect.stringContaining('100 USDC'),
        }),
        expect.any(Object),
      );
    });
  });
});
