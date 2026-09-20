import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';
import { err, ok } from '@/lib/result';
import { retrieveTwins } from '@/actions/twins';

const paramsSchema = z.object({ id: z.string() });

/** A twin id is guessable (ULID, not a secret), so ownership is checked, not just existence. */
export const GET = apiHandler({
  name: 'twins.status',
  auth: ['shopper_session'],
  schema: { params: paramsSchema },
  handler: async ({ params, shopper }) => {
    const [twin] = await retrieveTwins({ ids: [params.id], shopperIds: [shopper.shopperId] });

    if (!twin) return err({ code: 'NOT_FOUND', message: 'twin not found' });

    return ok({ status: twin.status, twinUrl: twin.twinUrl, isDefault: twin.isDefault });
  },
});
