import Stripe from 'stripe';
import { env } from '@/lib/env';

// Optional in dev (section 3, same null-safety convention as resend/redis) —
// a dev placeholder key still constructs a client, it just can't reach
// Stripe's API; only the webhook signature-verification path is exercised
// without a real key.
export const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;
