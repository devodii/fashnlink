import { redis } from '@/lib/redis';
import type { Logger } from '@/lib/log';

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export type CreateFetchOptions = {
  log: Logger;
  perDomainRps?: number;
  retries?: number;
  timeoutMs?: number;
};

function jitter(baseMs: number) {
  return baseMs + Math.random() * baseMs * 0.5;
}

// Per-domain token bucket in Redis (section 6.8) so concurrent requests from
// multiple users don't hammer one store. No-ops (never blocks) when Redis
// isn't configured, which is the default in local dev (section 3).
async function waitForDomainSlot(domain: string, perDomainRps: number) {
  if (!redis || perDomainRps <= 0) return;
  const windowMs = 1000;
  const key = `http:rps:${domain}:${Math.floor(Date.now() / windowMs)}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.pexpire(key, windowMs);
  if (count > perDomainRps) {
    await new Promise((resolve) => setTimeout(resolve, windowMs));
  }
}

// One fetch factory used by every adapter (section 6.8): realistic browser UA,
// per-domain rate limiting, retries on 429/5xx with jitter, and a hard timeout.
export function createFetch(opts: CreateFetchOptions): typeof fetch {
  const { log, perDomainRps = 2, retries = 2, timeoutMs = 10_000 } = opts;

  return async function rateLimitedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const url =
      typeof input === 'string'
        ? new URL(input)
        : input instanceof URL
          ? input
          : new URL(input.url);
    await waitForDomainSlot(url.hostname, perDomainRps);

    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(input, {
          ...init,
          signal: controller.signal,
          headers: {
            'user-agent': DEFAULT_UA,
            'accept-language': 'en-US,en;q=0.9',
            'accept-encoding': 'gzip',
            ...init?.headers,
          },
        });
        clearTimeout(timeout);
        if ((response.status === 429 || response.status >= 500) && attempt < retries) {
          const backoff = jitter(300 * 2 ** attempt);
          log.warn(
            { url: url.toString(), status: response.status, attempt, backoff },
            'http retry',
          );
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }
        return response;
      } catch (error) {
        clearTimeout(timeout);
        lastError = error;
        if (attempt < retries) {
          const backoff = jitter(300 * 2 ** attempt);
          log.warn({ url: url.toString(), attempt, backoff, error }, 'http retry after error');
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }
      }
    }
    throw lastError;
  };
}
