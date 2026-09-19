// Section 13: single source of truth for pricing. Nothing outside this file
// hardcodes a credit amount, price, or plan limit — the `credit_ledger`
// module (M3), billing routes, and any pricing UI all read from here.

export type PlanKey = 'free' | 'founder' | 'starter' | 'growth';

export const PLANS: Record<
  PlanKey,
  {
    name: string;
    priceCents: number | null;
    period: 'once' | 'month' | null;
    /** Credits granted immediately on reaching this plan (founder: a single
     * one-time grant; free: the once-off signup grant, section 13's
     * "20 once + 10/month" — the monthly free top-up is a cron concern, not
     * modeled here). */
    creditsOnGrant: number;
    watermark: boolean;
    overageCentsPerRender: number | null;
  }
> = {
  free: {
    name: 'Free',
    priceCents: 0,
    period: null,
    creditsOnGrant: 20,
    watermark: true,
    overageCentsPerRender: null,
  },
  founder: {
    name: 'Founder',
    priceCents: 19900,
    period: 'once',
    creditsOnGrant: 1000,
    watermark: false,
    overageCentsPerRender: null,
  },
  starter: {
    name: 'Starter',
    priceCents: 4900,
    period: 'month',
    creditsOnGrant: 300,
    watermark: false,
    overageCentsPerRender: 15,
  },
  growth: {
    name: 'Growth',
    priceCents: 14900,
    period: 'month',
    creditsOnGrant: 1200,
    watermark: false,
    overageCentsPerRender: 12,
  },
};

// Section 7.5 (model pack): a one-time, separately-tracked grant so it never
// eats a merchant's regular render credits.
export const MODEL_PACK_CREDIT_COST = 15;
export const MODEL_PACK_MAX_PRODUCTS = 5;
export const MODEL_PACK_STOCK_MODEL_COUNT = 3;

export const FOUNDING_PASS_SEATS_TOTAL = 30;

export function formatPriceCents(cents: number | null): string {
  if (cents === null) return 'Free';
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}
