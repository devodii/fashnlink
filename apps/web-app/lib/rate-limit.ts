import { redis } from '@/lib/redis';
import { logger } from '@/lib/log';

// Fixed-window counter, not a true sliding window.
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; limit: number; remaining: number; reset: Date }> {
  const openResult = {
    allowed: true,
    limit,
    remaining: limit,
    reset: new Date(Date.now() + windowSeconds * 1000),
  };

  try {
    const bucket = `ratelimit:${key}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
    const count = await redis.incr(bucket);
    if (count === 1) await redis.expire(bucket, windowSeconds);
    const ttl = await redis.ttl(bucket);
    const reset = new Date(Date.now() + Math.max(ttl, 0) * 1000);
    return { allowed: count <= limit, limit, remaining: Math.max(limit - count, 0), reset };
  } catch (cause) {
    logger.warn({ cause, key }, 'rate limit check failed, failing open');
    return openResult;
  }
}
