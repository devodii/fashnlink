import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { apiHandler } from '@/lib/api-handler';
import { err, ok } from '@/lib/result';
import { env } from '@/lib/env';
import { stripe } from '@/lib/stripe';
import { db } from '@/db';
import { merchants, stripeEvents } from '@/db/schema';
import { PLANS } from '@/config/pricing';
import { childLogger } from '@/lib/log';
import { grantCredits } from '@/modules/render/credit-ledger';

// Standard Fetch `Request`/`NextRequest` bodies can only be read once —
// Stripe's signature check needs the exact raw bytes, and the handler needs
// the parsed event, so `webhookVerify` reads a *clone* and leaves the
// original request body untouched for the handler to read again.
async function verifyAndParse(req: Request): Promise<Stripe.Event | null> {
  if (!stripe) return null;
  const signature = req.headers.get('stripe-signature');
  if (!signature || !env.STRIPE_WEBHOOK_SECRET) return null;
  try {
    const rawBody = await req.clone().text();
    return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return null;
  }
}

// Section 8.4/13: `POST /api/webhooks/stripe` — the founding-pass Payment
// Link's `checkout.session.completed` event grants 1000 credits and turns
// off the watermark. Idempotent via `stripe_events` (the event id is its own
// primary key, section 5) — a Stripe retry of the same event is a no-op.
export const POST = apiHandler({
  name: 'webhooks.stripe',
  auth: ['webhook'],
  webhookVerify: async (req) => {
    const event = await verifyAndParse(req);
    return event
      ? ok(undefined)
      : err({ code: 'UNAUTHORIZED', message: 'invalid stripe signature' });
  },
  handler: async ({ req, requestId }) => {
    const event = await verifyAndParse(req);
    if (!event) return err({ code: 'UNAUTHORIZED', message: 'invalid stripe signature' });

    const log = childLogger(requestId, { route: 'webhooks.stripe', eventId: event.id });

    const [existing] = await db
      .select({ id: stripeEvents.id })
      .from(stripeEvents)
      .where(eq(stripeEvents.id, event.id))
      .limit(1);
    if (existing) {
      log.info('stripe event already processed, skipping');
      return ok({ received: true, duplicate: true });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const merchantId = session.client_reference_id;
      const priceId = session.line_items?.data?.[0]?.price?.id;

      // `client_reference_id` is set on the Payment Link URL (section 8.2:
      // "Buy founding pass" opens it with `?client_reference_id=<merchantId>`).
      // The price-id match (section 8.4) guards against a future second
      // Payment Link/price reusing this same webhook route without also
      // reusing this founding-pass grant logic.
      if (merchantId && (!priceId || priceId === env.STRIPE_FOUNDING_PASS_PRICE_ID)) {
        const [merchant] = await db
          .select()
          .from(merchants)
          .where(eq(merchants.id, merchantId))
          .limit(1);

        if (merchant) {
          await grantCredits(merchantId, PLANS.founder.creditsOnGrant, 'purchase_founder');
          await db
            .update(merchants)
            .set({
              plan: 'founder',
              watermarkEnabled: false,
              stripeCustomerId: session.customer as string | null,
            })
            .where(eq(merchants.id, merchantId));
        } else {
          log.error({ merchantId }, 'stripe webhook: merchant not found for client_reference_id');
        }
      }
    }

    await db
      .insert(stripeEvents)
      .values({ id: event.id, type: event.type, payload: event as unknown as object });

    return ok({ received: true });
  },
});
