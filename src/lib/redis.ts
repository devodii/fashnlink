import { Redis } from '@upstash/redis';
import { env } from '@/lib/env';

/**
 * Shared Upstash client for rate limits, short-lived caches, and idempotency
 * keys. Optional in dev; callers that need Redis to
 * function (rate limiting, per-domain fetch throttling) must treat `null` as
 * "skip the check" rather than throwing, so local dev works without it.
 */
export const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
    : null;
