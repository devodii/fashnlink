import type { Ctx } from '@/lib/adapter';
import { createFetch } from '@/lib/http';
import {
  OPTIONAL_CAPABILITY_METHODS,
  type HomepageProbe,
  type ScraperAdapter,
  type ScraperCapability,
} from './types';

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

export async function probeHomepage(url: URL, ctx: Ctx): Promise<HomepageProbe> {
  const fetchImpl = ctx.fetch ?? createFetch({ log: ctx.log });
  const origin = `${url.protocol}//${url.host}`;
  const response = await fetchImpl(origin, { method: 'GET' });
  const html = await response.text();
  return { url: new URL(origin), status: response.status, headers: response.headers, html };
}
