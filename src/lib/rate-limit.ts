import { redis } from '@/lib/redis';

/**
 * Extracted from src/lib/api-handler.ts (which used this only for its
 * HTTP-bound `config.rateLimit` slot) so module-level code; render
 * submission, twin creation; that isn't behind a Next.js
 * route yet can use the same primitive instead of a second implementation.
 *
 * Fixed-window counter, not a true sliding window.
 * DECISION: simpler to reason about and cheap in Redis (one INCR+EXPIRE per
 * request); a true sliding window can replace this later if a burst right at
 * a window boundary turns out to matter for the limits this protects
 * (renders/twins/scrapes; see section 7.4/13, none of which are precise
 * enough to need sub-window accuracy).
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; limit: number; remaining: number; reset: Date }> {
  if (!redis)
    return {
      allowed: true,
      limit,
      remaining: limit,
      reset: new Date(Date.now() + windowSeconds * 1000),
    };

  const bucket = `ratelimit:${key}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
  const count = await redis.incr(bucket);
  if (count === 1) await redis.expire(bucket, windowSeconds);
  const ttl = await redis.ttl(bucket);
  const reset = new Date(Date.now() + Math.max(ttl, 0) * 1000);
  return { allowed: count <= limit, limit, remaining: Math.max(limit - count, 0), reset };
}
