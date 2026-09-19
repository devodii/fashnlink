import type { Ctx } from '@/lib/adapter';
import { createFetch } from '@/lib/http';
import {
  OPTIONAL_CAPABILITY_METHODS,
  type HomepageProbe,
  type ScraperAdapter,
  type ScraperCapability,
} from './types';

/**
 * The "richer" specialization section 4 refers to ("scraper adapters use the
 * richer ScraperAdapter interface behind ScraperRegistry, which extends
 * AdapterRegistry with capability queries"). It does not literally extend the
 * generic `AdapterRegistry<TInput,TOutput,TKey>` class; a ScraperAdapter's
 * shape (detect/getProduct/normalize + several optional methods) doesn't fit
 * that class's single `canHandle`/`run` pair, so forcing inheritance would
 * mean wrapping every adapter in an adapter. Composition here keeps the same
 * role (priority-ordered resolution, `get`, `list`) without a fake fit.
 */
export class ScraperRegistry {
  constructor(private adapters: ScraperAdapter[]) {
    this.assertCapabilities();
  }

  private assertCapabilities() {
    for (const adapter of this.adapters) {
      for (const capability of adapter.capabilities) {
        const method = OPTIONAL_CAPABILITY_METHODS[capability];
        if (method && typeof adapter[method] !== 'function') {
          throw new Error(
            `ScraperAdapter "${adapter.key}" declares capability "${capability}" but does not implement ${String(method)}()`,
          );
        }
      }
    }
  }

  get(key: string): ScraperAdapter | undefined {
    return this.adapters.find((adapter) => adapter.key === key);
  }

  list(): readonly ScraperAdapter[] {
    return this.adapters;
  }

  supports(key: string, capability: ScraperCapability): boolean {
    return this.get(key)?.capabilities.has(capability) ?? false;
  }

  private byPriority(): ScraperAdapter[] {
    return [...this.adapters].sort((a, b) => a.priority - b.priority);
  }

  /**
   * host patterns first (no network), then a homepage probe
   * through adapters in priority order, then `generic` as the final fallback.
   */
  async resolveByUrl(
    url: URL,
    ctx: Ctx,
  ): Promise<{ adapter: ScraperAdapter; detect: HomepageProbe } | null> {
    for (const adapter of this.byPriority()) {
      if (adapter.hostPatterns?.some((pattern) => pattern.test(url.hostname))) {
        return { adapter, detect: await probeHomepage(url, ctx) };
      }
    }

    const probe = await probeHomepage(url, ctx);
    for (const adapter of this.byPriority()) {
      if (adapter.key === 'generic' || adapter.key === 'manual') continue;
      const result = await adapter.detect(probe, ctx);
      if (result.match) return { adapter, detect: probe };
    }

    const generic = this.get('generic');
    if (!generic) return null;
    return { adapter: generic, detect: probe };
  }
}

// One homepage GET, shared by every adapter's `detect`.
export async function probeHomepage(url: URL, ctx: Ctx): Promise<HomepageProbe> {
  const fetchImpl = ctx.fetch ?? createFetch({ log: ctx.log });
  const origin = `${url.protocol}//${url.host}`;
  const response = await fetchImpl(origin, { method: 'GET' });
  const html = await response.text();
  return { url: new URL(origin), status: response.status, headers: response.headers, html };
}
