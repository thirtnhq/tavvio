import * as crypto from 'crypto';

/**
 * Sign a webhook payload with HMAC-SHA256
 * @param payload The JSON payload to sign
 * @param secret The webhook secret
 * @returns The signature in format: sha256=<hex>
 */
export function signWebhookPayload(payload: string, secret: string): string {
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return `sha256=${signature}`;
}

/**
 * Verify a webhook signature
 * @param payload The original payload
 * @param signature The signature to verify (format: sha256=<hex>)
 * @param secret The webhook secret
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expected = signWebhookPayload(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected),
  );
}
