import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationsProcessor } from './notifications.processor';
import { Resend } from 'resend';
import { Job } from 'bullmq';
import { EmailJobData } from './types';

jest.mock('resend');

describe('NotificationsProcessor', () => {
  let processor: NotificationsProcessor;
  let mockSend: jest.Mock;

  beforeEach(async () => {
    mockSend = jest.fn();

    (Resend as jest.Mock).mockImplementation(() => ({
      emails: { send: mockSend },
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsProcessor,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                RESEND_API_KEY: 're_test_key',
                EMAIL_FROM: 'test@useroutr.io',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    processor = module.get<NotificationsProcessor>(NotificationsProcessor);
  });

  it('should process sendEmail jobs successfully', async () => {
    mockSend.mockResolvedValue({
      data: { id: 'test-id' },
      error: null,
    });

    const job: Job<EmailJobData> = {
      name: 'sendEmail',
      data: {
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      },
    } as Job<EmailJobData>;

    await processor.process(job);

    expect(mockSend).toHaveBeenCalledWith({
      from: 'test@useroutr.io',
      to: ['user@example.com'],
      subject: 'Test Subject',
      html: '<p>Test</p>',
    });
  });

  it('should pass attachments to Resend when provided', async () => {
    mockSend.mockResolvedValue({
      data: { id: 'test-id' },
      error: null,
    });

    const job: Job<EmailJobData> = {
      name: 'sendEmail',
      data: {
        to: 'user@example.com',
        subject: 'Invoice',
        html: '<p>Invoice</p>',
        attachments: [
          { filename: 'invoice.pdf', path: 'https://example.com/invoice.pdf' },
        ],
      },
    } as Job<EmailJobData>;

    await processor.process(job);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          {
            filename: 'invoice.pdf',
            path: 'https://example.com/invoice.pdf',
          },
        ],
      }),
    );
  });

  it('should throw error when resend fails', async () => {
    const errorMsg = 'Failed to send';
    mockSend.mockResolvedValue({
      data: null,
      error: { message: errorMsg },
    });

    const job: Job<EmailJobData> = {
      name: 'sendEmail',
      data: {
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      },
    } as Job<EmailJobData>;

    await expect(processor.process(job)).rejects.toThrow(errorMsg);
  });

  it('should throw on missing RESEND_API_KEY', async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          NotificationsProcessor,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile(),
    ).rejects.toThrow('RESEND_API_KEY');
  });
});
