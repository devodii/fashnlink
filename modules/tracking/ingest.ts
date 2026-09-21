import type { Logger } from '@/lib/log';
import { err, ok, type Result } from '@/lib/result';
import { consumeRateLimit } from '@/lib/rate-limit';
import { retrieveStores, updateStores } from '@/actions/stores';
import {
  countDiscoveredPaths,
  createDiscoveredPaths,
  retrieveDiscoveredPaths,
} from '@/actions/discovered-paths';
import {
  DISCOVERED_PATHS_MAX_PER_STORE,
  TRACK_INGEST_REQUESTS_PER_TOKEN_PER_HOUR,
} from '@/constants';
import { scoreDiscoveredPath } from './classify';

export type IngestPathInput = { path: string; linkText: string | null };

/**
 * Rate-limited manually here (keyed by the raw token) rather than through
 * apiHandler's `rateLimit` config: that config derives its key
 * synchronously from `{ auth, req }` before the body is parsed, but the
 * token this endpoint rate-limits by only exists inside the JSON body.
 */
export async function ingestDiscoveredPaths(
  input: { token: string; paths: IngestPathInput[]; originHost: string | null },
  log: Logger,
): Promise<Result<{ ok: true }>> {
  const rateLimit = await consumeRateLimit(
    `track:${input.token}`,
    TRACK_INGEST_REQUESTS_PER_TOKEN_PER_HOUR,
    3600,
  );
  if (!rateLimit.allowed) {
    return err({ code: 'RATE_LIMITED', message: 'Too many requests' });
  }

  const [store] = await retrieveStores({ trackingToken: input.token });
  if (!store) {
    log.warn('track ingest: token did not match any store');
    return err({ code: 'UNAUTHORIZED', message: 'Invalid token' });
  }

  /**
   * The script's own POST body never carries the merchant's real domain
   * (out of the confirmed {token, paths} shape), so this learns it
   * opportunistically from the standard cross-origin `Origin` header
   * instead. Needed so settings' "turn into a link" action can resolve a
   * discovered path back into a full URL for the existing scrape pipeline.
   */
  if (input.originHost && input.originHost !== store.domain) {
    const [conflicting] = await retrieveStores({ domains: [input.originHost] });
    if (!conflicting) await updateStores([store.id], { domain: input.originHost });
  }

  const dedupedByPath = new Map<string, IngestPathInput>();
  for (const candidate of input.paths) {
    if (!dedupedByPath.has(candidate.path)) dedupedByPath.set(candidate.path, candidate);
  }
  const incoming = [...dedupedByPath.values()];
  if (incoming.length === 0) return ok({ ok: true });

  const [existingCount, existingMatches] = await Promise.all([
    countDiscoveredPaths(store.id),
    retrieveDiscoveredPaths({ storeIds: [store.id], paths: incoming.map((p) => p.path) }),
  ]);
  const existingPaths = new Set(existingMatches.map((p) => p.path));

  let remainingCapacity = Math.max(0, DISCOVERED_PATHS_MAX_PER_STORE - existingCount);
  const accepted: IngestPathInput[] = [];
  for (const candidate of incoming) {
    if (existingPaths.has(candidate.path)) {
      accepted.push(candidate);
      continue;
    }
    if (remainingCapacity <= 0) continue;
    remainingCapacity -= 1;
    accepted.push(candidate);
  }
  if (accepted.length === 0) return ok({ ok: true });

  await createDiscoveredPaths(
    accepted.map((candidate) => {
      const { score, signals } = scoreDiscoveredPath(candidate);
      return {
        storeId: store.id,
        path: candidate.path,
        linkText: candidate.linkText,
        score,
        meta: signals.length ? { signals } : null,
      };
    }),
  );

  return ok({ ok: true });
}
