import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';
import { garmentCategoryEnum } from '@/db/schema';
import { err, ok } from '@/lib/result';
import { retrieveLinks, updateLinks } from '@/actions/links';
import { updateProducts } from '@/actions/products';

const paramsSchema = z.object({ id: z.string() });
const bodySchema = z.object({
  status: z.enum(['active', 'paused', 'archived']).optional(),
  garmentCategory: z.enum(garmentCategoryEnum.enumValues).optional(),
});

export const PATCH = apiHandler({
  name: 'links.update',
  auth: ['merchant_session'],
  schema: { params: paramsSchema, body: bodySchema },
  handler: async ({ params, body, merchant }) => {
    const [link] = await retrieveLinks({ ids: [params.id] });
    if (!link || link.merchantId !== merchant.merchantId) {
      return err({ code: 'NOT_FOUND', message: 'Link not found' });
    }

    const writes: Promise<unknown>[] = [];
    if (body.status) writes.push(updateLinks([link.id], { status: body.status }));

    if (body.garmentCategory) {
      const productId = link.productIds[0];
      if (productId) {
        writes.push(updateProducts([productId], { garmentCategory: body.garmentCategory }));
      }
    }

    await Promise.all(writes);

    return ok({ id: link.id });
  },
});
