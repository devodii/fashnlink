import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { apiHandler, requireMerchantSession } from '@/lib/api-handler';
import { db } from '@/db';
import { products, garmentCategoryEnum } from '@/db/schema';
import { err, ok } from '@/lib/result';
import { findLinkById, updateLinkStatus } from '@/db/repos/links';

const paramsSchema = z.object({ id: z.string() });
const bodySchema = z.object({
  status: z.enum(['active', 'paused', 'archived']).optional(),
  garmentCategory: z.enum(garmentCategoryEnum.enumValues).optional(),
});

/**
 * `/dashboard/links/[id]`; pause/archive the link, and (via the
 * product panel's editable garment-category select) re-route future renders
 * for the product it points at.
 */
export const PATCH = apiHandler({
  name: 'links.update',
  auth: ['merchant_session'],
  schema: { params: paramsSchema, body: bodySchema },
  handler: async ({ params, body, auth }) => {
    const merchant = requireMerchantSession(auth);
    if (!merchant.ok) return merchant;

    const link = await findLinkById(params.id);
    if (!link || link.merchantId !== merchant.value.merchantId) {
      return err({ code: 'NOT_FOUND', message: 'Link not found' });
    }

    if (body.status) await updateLinkStatus(link.id, body.status);

    if (body.garmentCategory) {
      const productId = link.productIds[0];
      if (productId) {
        await db
          .update(products)
          .set({ garmentCategory: body.garmentCategory })
          .where(eq(products.id, productId));
      }
    }

    return ok({ id: link.id });
  },
});
