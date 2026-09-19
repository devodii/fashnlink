import type { Ctx } from '@/lib/adapter';
import { childLogger } from '@/lib/log';

// Test-only helper (not exported from any adapter's public surface): a Ctx
// whose `fetch` resolves every call with the given fixture HTML, so
// `getProduct`/`scrapeJsonLdProductPage` can be exercised against recorded
// real responses with zero network access, per section 6.9.
export function fakeCtxWithHtml(html: string): Ctx {
  return {
    log: childLogger('test'),
    requestId: 'test',
    deadlineMs: Date.now() + 30_000,
    fetch: (async () =>
      new Response(html, {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })) as typeof fetch,
  };
}
