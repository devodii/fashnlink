import { describe, expect, it } from 'vitest';
import { Webhook as StandardWebhook } from 'standardwebhooks';
import { WebhookVerificationError } from '@polar-sh/sdk/webhooks';
import { PayKit } from '@paykit-sdk/core';
import { createPolar } from '@paykit-sdk/polar';

/**
 * Runs the real `paykit.webhooks` path (the one `app/api/webhooks/polar/route.ts`
 * actually calls) against the real `@polar-sh/sdk` verification and the real
 * `standardwebhooks` signer it's built on, rather than a hand-rolled HMAC
 * check. Signature verification is pure local crypto, so no live Polar
 * account is needed.
 */
const WEBHOOK_SECRET = 'a-fake-webhook-secret-for-testing';
const WEBHOOK_SECRET_BASE64 = Buffer.from(WEBHOOK_SECRET, 'utf-8').toString('base64');

const paykit = new PayKit(createPolar({ accessToken: 'fake-access-token', isSandbox: true }));

function signedHeaders(body: string, webhookId = 'evt_test', timestamp = new Date()) {
  const signature = new StandardWebhook(WEBHOOK_SECRET_BASE64).sign(webhookId, timestamp, body);
  return {
    'webhook-id': webhookId,
    'webhook-timestamp': Math.floor(timestamp.getTime() / 1000).toString(),
    'webhook-signature': signature,
  };
}

async function handle(body: string, headersAsObject: Record<string, string>) {
  await paykit.webhooks
    .setup({ webhookSecret: WEBHOOK_SECRET })
    .handle({ body, headersAsObject, fullUrl: 'https://example.com/api/webhooks/polar' });
}

describe('polar webhook signature verification through paykit (the path app/api/webhooks/polar/route.ts uses)', () => {
  /**
   * A real `order.paid` payload has dozens of required fields not worth
   * hand-fabricating here. Verification happens before payload-shape
   * parsing, so this minimal body fails with a schema validation error
   * rather than a `WebhookVerificationError`, proving the signature itself
   * was accepted.
   */
  it('accepts a correctly-signed payload (fails later on business-schema shape, not on signature)', async () => {
    const body = JSON.stringify({ type: 'order.paid', data: { id: 'order_123' } });
    const headers = signedHeaders(body);

    let caught: unknown;
    try {
      await handle(body, headers);
    } catch (error) {
      caught = error;
    }

    expect(caught).not.toBeInstanceOf(WebhookVerificationError);
  });

  it('rejects a payload with a tampered body (signature no longer matches)', async () => {
    const original = JSON.stringify({ type: 'order.paid', data: { id: 'order_1' } });
    const headers = signedHeaders(original);
    const tampered = JSON.stringify({ type: 'order.paid', data: { id: 'order_EVIL' } });

    await expect(handle(tampered, headers)).rejects.toThrow();
  });

  it('rejects a payload signed with the wrong secret', async () => {
    const body = JSON.stringify({ type: 'order.paid', data: { id: 'order_1' } });
    const headers = signedHeaders(body);

    await expect(
      paykit.webhooks.setup({ webhookSecret: 'not-the-real-secret' }).handle({
        body,
        headersAsObject: headers,
        fullUrl: 'https://example.com/api/webhooks/polar',
      }),
    ).rejects.toThrow();
  });
});
