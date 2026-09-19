import { describe, expect, it } from 'vitest';
import { Webhook } from 'standardwebhooks';
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';

/**
 * Runs against the real `@polar-sh/sdk` verification function and the real
 * `standardwebhooks` signer it's built on, the same two packages Polar's own
 * SDK test suite uses together, rather than a hand-rolled HMAC check.
 * Signature verification is pure local crypto, so no live Polar account is
 * needed.
 */
const WEBHOOK_SECRET = 'a-fake-webhook-secret-for-testing';
const WEBHOOK_SECRET_BASE64 = Buffer.from(WEBHOOK_SECRET, 'utf-8').toString('base64');

function signedHeaders(body: string, webhookId = 'evt_test', timestamp = new Date()) {
  const signature = new Webhook(WEBHOOK_SECRET_BASE64).sign(webhookId, timestamp, body);
  return {
    'webhook-id': webhookId,
    'webhook-timestamp': Math.floor(timestamp.getTime() / 1000).toString(),
    'webhook-signature': signature,
  };
}

describe('polar webhook signature verification (the pattern app/api/webhooks/polar/route.ts uses)', () => {
  /**
   * A real `order.paid` payload has dozens of required fields not worth
   * hand-fabricating here. `validateEvent` checks the signature before it
   * parses the business payload, so this minimal body fails with a zod
   * validation error rather than a `WebhookVerificationError`, proving the
   * signature itself was accepted.
   */
  it('accepts a correctly-signed payload (fails later on business-schema shape, not on signature)', () => {
    const body = JSON.stringify({ type: 'order.paid', data: { id: 'order_123' } });
    const headers = signedHeaders(body);

    let caught: unknown;
    try {
      validateEvent(body, headers, WEBHOOK_SECRET);
    } catch (error) {
      caught = error;
    }

    expect(caught).not.toBeInstanceOf(WebhookVerificationError);
  });

  it('rejects a payload with a tampered body (signature no longer matches)', () => {
    const original = JSON.stringify({ type: 'order.paid', data: { id: 'order_1' } });
    const headers = signedHeaders(original);
    const tampered = JSON.stringify({ type: 'order.paid', data: { id: 'order_EVIL' } });

    expect(() => validateEvent(tampered, headers, WEBHOOK_SECRET)).toThrow(
      WebhookVerificationError,
    );
  });

  it('rejects a payload signed with the wrong secret', () => {
    const body = JSON.stringify({ type: 'order.paid', data: { id: 'order_1' } });
    const headers = signedHeaders(body);

    expect(() => validateEvent(body, headers, 'not-the-real-secret')).toThrow(
      WebhookVerificationError,
    );
  });
});
