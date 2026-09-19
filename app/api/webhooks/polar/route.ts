import { eq } from 'drizzle-orm';
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';
import { apiHandler } from '@/lib/api-handler';
import { err, ok } from '@/lib/result';
import { env } from '@/lib/env';
import { db } from '@/db';
import { merchants, paymentEvents } from '@/db/schema';
import { PLANS } from '@/config/pricing';
import { childLogger } from '@/lib/log';
import { grantCredits } from '@/modules/render/credit-ledger';

/**
 * A Fetch `Request` body can only be read once, so `webhookVerify` reads a
 * *clone* and leaves the original untouched for the handler to read again.
 */
function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

async function verifyAndParse(req: Request) {
  if (!env.POLAR_WEBHOOK_SECRET) return null;
  try {
    const rawBody = await req.clone().text();
    return validateEvent(rawBody, headersToRecord(req.headers), env.POLAR_WEBHOOK_SECRET);
  } catch (cause) {
    if (cause instanceof WebhookVerificationError) return null;
    throw cause;
  }
}

/**
 * Merchant identity is carried through Polar's `customer_external_id`
 * checkout param, so the "Buy founding pass" link must be built with
 * `?customer_external_id=<merchantId>` or this handler can't credit anyone.
 */
export const POST = apiHandler({
  name: 'webhooks.polar',
  auth: ['webhook'],
  webhookVerify: async (req) => {
    const event = await verifyAndParse(req);
    return event
      ? ok(undefined)
      : err({ code: 'UNAUTHORIZED', message: 'invalid polar signature' });
  },
  handler: async ({ req, requestId }) => {
    const event = await verifyAndParse(req);
    if (!event) return err({ code: 'UNAUTHORIZED', message: 'invalid polar signature' });

    /**
     * Polar doesn't give every payload a stable top-level `id`; `order.paid`
     * is the only event this route acts on, and its `data.id` (the order id)
     * is unique per delivery, so idempotency keys on that.
     */
    const eventId = 'id' in event.data ? String(event.data.id) : `${event.type}:${Date.now()}`;
    const log = childLogger(requestId, { route: 'webhooks.polar', eventId, type: event.type });

    const [existing] = await db
      .select({ id: paymentEvents.id })
      .from(paymentEvents)
      .where(eq(paymentEvents.id, eventId))
      .limit(1);
    if (existing) {
      log.info('polar event already processed, skipping');
      return ok({ received: true, duplicate: true });
    }

    if (event.type === 'order.paid') {
      const order = event.data;
      const merchantId = order.customer?.externalId ?? null;
      const matchesFoundingPass =
        !env.POLAR_FOUNDING_PASS_PRODUCT_ID ||
        order.productId === env.POLAR_FOUNDING_PASS_PRODUCT_ID;

      if (merchantId && matchesFoundingPass) {
        const [merchant] = await db
          .select()
          .from(merchants)
          .where(eq(merchants.id, merchantId))
          .limit(1);

        if (merchant) {
          await grantCredits(merchantId, PLANS.founder.creditsOnGrant, 'purchase_founder');
          await db
            .update(merchants)
            .set({ plan: 'founder', watermarkEnabled: false })
            .where(eq(merchants.id, merchantId));
        } else {
          log.error({ merchantId }, 'polar webhook: merchant not found for customer_external_id');
        }
      }
    }

    await db.insert(paymentEvents).values({
      id: eventId,
      provider: 'polar',
      type: event.type,
      payload: event as unknown as object,
    });

    return ok({ received: true });
  },
});
