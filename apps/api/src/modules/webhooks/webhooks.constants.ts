export const WEBHOOK_EVENTS = [
  'payment.pending',
  'payment.processing',
  'payment.completed',
  'payment.failed',
  'payout.initiated',
  'payout.completed',
  'payout.failed',
  'invoice.paid',
  'invoice.overdue',
  'refund.created',
  'refund.completed',
  'link.paid',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];

// Exponential backoff: 30s, 2min, 15min, 1hr, 4hr
export const RETRY_DELAYS = [
  30 * 1000,        // 30 seconds
  2 * 60 * 1000,    // 2 minutes
  15 * 60 * 1000,   // 15 minutes
  60 * 60 * 1000,   // 1 hour
  4 * 60 * 60 * 1000, // 4 hours
];

export const MAX_ATTEMPTS = 5;
export const WEBHOOK_REQUEST_TIMEOUT = 10000; // 10 seconds
export const WEBHOOK_QUEUE_NAME = 'webhooks';
export const WEBHOOK_JOB_NAME = 'deliver';
