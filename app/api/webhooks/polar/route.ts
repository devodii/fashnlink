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

// DECISION: payment processor switched from Stripe to Polar mid-build (this
// route was originally `/api/webhooks/stripe`, using Stripe's SDK — see the
// now-removed `src/lib/stripe.ts`). Same reasoning as fal/stripe's webhook
// routes: a standard Fetch `Request` body can only be read once, so
// `webhookVerify` reads a *clone* and leaves the original untouched for the
// handler to read again. `validateEvent` (unlike Stripe's `constructEvent`)
// is synchronous and takes a plain header object, not a `Headers` instance.
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

// Section 8.4/13 (adapted from Stripe to Polar): `POST /api/webhooks/polar`
// — the founding-pass Checkout Link's completed-order event grants 1000
// credits and turns off the watermark. Idempotent via `payment_events` (the
// provider's own event id is its primary key, section 5) — a Polar retry of
// the same event is a no-op. Merchant identity is carried through Polar's
// `customer_external_id` mechanism (their documented equivalent of Stripe's
// `client_reference_id`) — "Buy founding pass" (section 8.2, not yet built)
// must open the checkout link with `?customer_external_id=<merchantId>`.
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

    // Polar doesn't give every payload a stable top-level `id` the way
    // Stripe's `Event` does — `order.paid`'s `data.id` (the order id) is the
    // one that's actually unique per delivery for the event this route acts
    // on, so idempotency keys on that rather than a synthesized value.
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
