import { eq } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { paykit } from '@/lib/paykit';
import { err, ok } from '@/lib/result';
import { env } from '@/lib/env';
import { db } from '@/db';
import { merchants, paymentEvents } from '@/db/schema';
import { PLANS } from '@/config/pricing';
import { childLogger } from '@/lib/log';
import { grantCredits } from '@/modules/render/credit-ledger';

/**
 * A Fetch `Request` body can only be read once, so `webhookVerify` reads a
 * clone through a zero-handler `paykit.webhooks` dispatch (verification only,
 * nothing to run) and leaves the original untouched for the handler to read
 * again with the real `.on('payment.succeeded', ...)` registered.
 */
function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

export const POST = apiHandler({
  name: 'webhooks.polar',
  auth: ['webhook'],
  webhookVerify: async (req) => {
    if (!paykit || !env.POLAR_WEBHOOK_SECRET) {
      return err({ code: 'UNAUTHORIZED', message: 'polar not configured' });
    }
    try {
      const rawBody = await req.clone().text();
      await paykit.webhooks.setup({ webhookSecret: env.POLAR_WEBHOOK_SECRET }).handle({
        body: rawBody,
        headersAsObject: headersToRecord(req.headers),
        fullUrl: req.url,
      });
      return ok(undefined);
    } catch (cause) {
      return err({ code: 'UNAUTHORIZED', message: 'invalid polar signature', cause });
    }
  },
  handler: async ({ req, requestId }) => {
    if (!paykit || !env.POLAR_WEBHOOK_SECRET) {
      return err({ code: 'UNAUTHORIZED', message: 'polar not configured' });
    }

    const log = childLogger(requestId, { route: 'webhooks.polar' });
    const rawBody = await req.text();
    const headersRecord = headersToRecord(req.headers);
    const fullUrl = req.url;

    try {
      await paykit.webhooks
        .setup({ webhookSecret: env.POLAR_WEBHOOK_SECRET })
        .on('payment.succeeded', async (event) => {
          const payment = event.data;
          const eventId = payment.id;

          const [existing] = await db
            .select({ id: paymentEvents.id })
            .from(paymentEvents)
            .where(eq(paymentEvents.id, eventId))
            .limit(1);
          if (existing) {
            log.info({ eventId }, 'polar payment already processed, skipping');
            return;
          }

          const merchantId = payment.metadata['merchantId'];
          const matchesFoundingPass =
            !env.POLAR_FOUNDING_PASS_PRODUCT_ID ||
            payment.item_id === env.POLAR_FOUNDING_PASS_PRODUCT_ID;

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
              log.error(
                { merchantId },
                'polar webhook: merchant not found for metadata.merchantId',
              );
            }
          }

          await db.insert(paymentEvents).values({
            id: eventId,
            provider: 'polar',
            type: 'payment.succeeded',
            payload: payment as unknown as object,
          });
        })
        .handle({ body: rawBody, headersAsObject: headersRecord, fullUrl });
    } catch (cause) {
      return err({ code: 'UNAUTHORIZED', message: 'invalid polar signature', cause });
    }

    return ok({ received: true });
  },
});
