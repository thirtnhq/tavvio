import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsProcessor } from './notifications.processor';
import { Resend } from 'resend';
import { Job } from 'bullmq';

jest.mock('resend');

describe('NotificationsProcessor', () => {
  let processor: NotificationsProcessor;
  let mockResend: jest.Mocked<Resend>;

  beforeEach(async () => {
    mockResend = {
      emails: {
        send: jest.fn(),
      },
    } as any;

    (Resend as jest.Mock).mockImplementation(() => mockResend);

    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsProcessor],
    }).compile();

    processor = module.get<NotificationsProcessor>(NotificationsProcessor);
  });

  it('should process sendEmail jobs successfully', async () => {
    (mockResend.emails.send as jest.Mock).mockResolvedValue({
      data: { id: 'test-id' },
      error: null,
    });

    const job = {
      name: 'sendEmail',
      data: {
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      },
    } as Job;

    await expect(processor.process(job)).resolves.not.toThrow();

    expect(mockResend.emails.send).toHaveBeenCalledWith({
      from: expect.any(String),
      to: ['user@example.com'],
      subject: 'Test Subject',
      html: '<p>Test</p>',
    });
  });

  it('should throw error when resend fails', async () => {
    const errorMsg = 'Failed to send';
    (mockResend.emails.send as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: errorMsg },
    });

    const job = {
      name: 'sendEmail',
      data: {
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      },
    } as Job;

    await expect(processor.process(job)).rejects.toThrow(errorMsg);
  });
});
