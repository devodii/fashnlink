import type { Logger } from '@/lib/log';
import type { Result } from '@/lib/result';

/**
 * A pluggable component keyed by a discriminator, with a self-test for
 * "can I handle this input". Render providers, ESP adapters, and
 * storage backends implement this directly. Scraper adapters use the richer
 * ScraperAdapter interface (src/modules/scraper) behind ScraperRegistry, which
 * extends AdapterRegistry with capability queries; no third pattern.
 */
export interface Adapter<TInput, TOutput, TKey extends string = string> {
  readonly key: TKey;
  canHandle(input: TInput): Promise<boolean> | boolean;
  run(input: TInput, ctx: Ctx): Promise<Result<TOutput>>;
}

/**
 * Ctx carries logger, request id, deadline, and a fetch with rate limiting +
 * retries (src/lib/http.ts).
 */
export type Ctx = {
  log: Logger;
  requestId: string;
  deadlineMs: number;
  fetch: typeof fetch;
};

// Registry that picks the first adapter that canHandle, in priority order.
export class AdapterRegistry<TInput, TOutput, TKey extends string = string> {
  constructor(protected adapters: Adapter<TInput, TOutput, TKey>[]) {}

  async resolve(input: TInput): Promise<Adapter<TInput, TOutput, TKey> | null> {
    for (const adapter of this.adapters) {
      if (await adapter.canHandle(input)) return adapter;
    }
    return null;
  }

  get(key: TKey): Adapter<TInput, TOutput, TKey> | undefined {
    return this.adapters.find((adapter) => adapter.key === key);
  }

  list(): readonly Adapter<TInput, TOutput, TKey>[] {
    return this.adapters;
  }
}
