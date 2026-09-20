import { PayKit } from '@paykit-sdk/core';
import { createPolar } from '@paykit-sdk/polar';
import { env } from '@/lib/env';

/**
 * The only file in this codebase that constructs a payment provider.
 * Swapping providers later (Stripe, PayPal, a custom one) means changing
 * this one file — every caller only ever imports `paykit` and PayKit's own
 * standard event/resource types, never a provider SDK directly.
 */
export const paykit = env.POLAR_ACCESS_TOKEN
  ? new PayKit(
      createPolar({
        accessToken: env.POLAR_ACCESS_TOKEN,
        isSandbox: env.NODE_ENV !== 'production',
      }),
    )
  : null;
