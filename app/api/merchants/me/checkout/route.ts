import { apiHandler } from '@/lib/api-handler';
import { paykit } from '@/lib/paykit';
import { err, ok } from '@/lib/result';
import { env } from '@/lib/env';
import { db } from '@/db';
import { merchants } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const POST = apiHandler({
  name: 'merchants.checkout.create',
  auth: ['merchant_session'],
  handler: async ({ merchant: session }) => {
    if (!paykit || !env.POLAR_FOUNDING_PASS_PRODUCT_ID) {
      return err({ code: 'INTERNAL', message: 'billing is not configured' });
    }

    const [merchant] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.id, session.merchantId))
      .limit(1);
    if (!merchant) return err({ code: 'NOT_FOUND', message: 'merchant not found' });

    try {
      const checkout = await paykit.checkouts.create({
        customer: { email: merchant.email },
        item_id: env.POLAR_FOUNDING_PASS_PRODUCT_ID,
        quantity: 1,
        session_type: 'one_time',
        metadata: { merchantId: merchant.id },
        success_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard/billing?purchase=success`,
        cancel_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard/billing?purchase=cancelled`,
      });
      return ok({ paymentUrl: checkout.payment_url });
    } catch (cause) {
      return err({ code: 'INTERNAL', message: 'failed to create checkout', cause });
    }
  },
});
