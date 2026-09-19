import type { Ctx } from '@/lib/adapter';
import { childLogger } from '@/lib/log';

// A Ctx whose fetch resolves every call with the given fixture HTML, no
// network access.
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
