import { apiHandler, createOptionsHandler } from '@/lib/api-handler';
import { childLogger } from '@/lib/log';
import { ok } from '@/lib/result';
import { ingestDiscoveredPaths } from '@/modules/tracking/ingest';
import { bodySchema } from './schema';

export const POST = apiHandler({
  name: 'track.ingest',
  auth: ['public'],
  cors: true,
  schema: { body: bodySchema },
  handler: async ({ body, req, requestId }) => {
    const log = childLogger(requestId, { route: 'track.ingest' });
    const origin = req.headers.get('origin');
    let originHost: string | null = null;
    try {
      originHost = origin ? new URL(origin).hostname : null;
    } catch {
      originHost = null;
    }

    const result = await ingestDiscoveredPaths({ ...body, originHost }, log);
    if (!result.ok) return result;
    return ok(result.value);
  },
});

export const OPTIONS = createOptionsHandler();
