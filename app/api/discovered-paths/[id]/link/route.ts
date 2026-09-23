import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';
import { childLogger } from '@/lib/log';
import { createFetch } from '@/lib/http';
import { err, ok } from '@/lib/result';
import { retrieveDiscoveredPaths, updateDiscoveredPaths } from '@/actions/discovered-paths';
import { retrieveStores } from '@/actions/stores';
import { createLinkFromUrl } from '@/modules/links/create-link-from-url';

export const POST = apiHandler({
  name: 'discoveredPaths.link',
  auth: ['merchant_session'],
  schema: { params: z.object({ id: z.string() }) },
  handler: async ({ params, merchant, requestId }) => {
    const [discoveredPath] = await retrieveDiscoveredPaths({ ids: [params.id] });
    if (!discoveredPath) return err({ code: 'NOT_FOUND', message: 'Discovered path not found' });

    const [store] = await retrieveStores({ ids: [discoveredPath.storeId] });
    if (!store || store.merchantId !== merchant.merchantId) {
      return err({ code: 'NOT_FOUND', message: 'Discovered path not found' });
    }

    const log = childLogger(requestId, { route: 'discoveredPaths.link' });
    const ctx = { log, requestId, deadlineMs: Date.now() + 90_000, fetch: createFetch({ log }) };
    const url = `https://${store.domain}${discoveredPath.path}`;

    const result = await createLinkFromUrl(url, merchant.merchantId, ctx);
    if (!result.ok) return result;

    await updateDiscoveredPaths([discoveredPath.id], { status: 'linked' });

    return ok(result.value);
  },
});
