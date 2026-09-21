import { apiHandler } from '@/lib/api-handler';
import { paykit } from '@/lib/paykit';
import { err, ok } from '@/lib/result';
import { env } from '@/lib/env';
import { db } from '@/db';
import { paymentEvents } from '@/db/schema';
import { PLANS } from '@/constants';
import { childLogger } from '@/lib/log';
import { grantCredits } from '@/modules/render/credit-ledger';
import { retrieveMerchants, updateMerchants } from '@/actions/merchants';

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

export const POST = apiHandler({
  name: 'webhooks.paykit',
  auth: ['public'],
  handler: async ({ req, requestId }) => {
    const log = childLogger(requestId, { route: 'webhooks.paykit' });
    const rawBody = await req.text();
    const headersRecord = headersToRecord(req.headers);
    const fullUrl = req.url;

    try {
      await paykit.webhooks
        .setup({ webhookSecret: env.POLAR_WEBHOOK_SECRET })
        .on('payment.succeeded', async (event) => {
          const payment = event.data;
          const eventId = payment.id;

          /**
           * Insert-first, not select-then-insert: a select-then-insert check
           * leaves a window where two concurrent deliveries of the same
           * webhook (standard retry behavior, and Polar/paykit is no
           * exception) can both see "not yet processed" and both grant
           * credits. The payment_events primary key makes the insert itself
           * the atomic dedupe gate, same pattern as api-handler's
           * idempotency-key lock.
           */
          const inserted = await db
            .insert(paymentEvents)
            .values({
              id: eventId,
              provider: 'polar',
              type: 'payment.succeeded',
              payload: payment as unknown as object,
            })
            .onConflictDoNothing({ target: paymentEvents.id })
            .returning({ id: paymentEvents.id });
          if (inserted.length === 0) {
            log.info({ eventId }, 'polar payment already processed, skipping');
            return;
          }

          const merchantId = payment.metadata['merchantId'];
          const matchesFoundingPass = payment.item_id === env.POLAR_FOUNDING_PASS_PRODUCT_ID;

          if (merchantId && matchesFoundingPass) {
            const [merchant] = await retrieveMerchants({ ids: [merchantId] });

            if (merchant) {
              await grantCredits(merchantId, PLANS.founder.creditsOnGrant, 'purchase_founder');
              await updateMerchants([merchantId], { plan: 'founder', watermarkEnabled: false });
            } else {
              log.error(
                { merchantId },
                'polar webhook: merchant not found for metadata.merchantId',
              );
            }
          }
        })
        .handle({ body: rawBody, headersAsObject: headersRecord, fullUrl });
    } catch (cause) {
      return err({ code: 'UNAUTHORIZED', message: 'invalid polar signature', cause });
    }

    return ok({ received: true });
  },
});
