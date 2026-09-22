import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { sharedRenderResponseSchema } from '@tryonlink/shared';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/db';
import { links, merchants, products, renders } from '@tryonlink/shared/schema';
import { err, ok } from '@/lib/result';

const paramsSchema = z.object({ id: z.string() });

/**
 * Thin mobile counterpart to app/(shopper)/r/[renderId]/page.tsx's
 * loadRender(): same unauthenticated public read, same isPublic gate.
 */
export const GET = apiHandler({
  name: 'public.sharedRender',
  auth: ['public'],
  schema: { params: paramsSchema },
  handler: async ({ params }) => {
    const [row] = await db
      .select({
        outputUrl: renders.outputUrl,
        isPublic: renders.isPublic,
        productTitle: products.title,
        priceCents: products.priceCents,
        currency: products.currency,
        merchantName: merchants.name,
        slug: links.slug,
      })
      .from(renders)
      .innerJoin(products, eq(renders.productId, products.id))
      .innerJoin(links, eq(renders.linkId, links.id))
      .innerJoin(merchants, eq(links.merchantId, merchants.id))
      .where(eq(renders.id, params.id))
      .limit(1);

    if (!row || !row.outputUrl || !row.isPublic) {
      return err({ code: 'NOT_FOUND', message: 'render not found' });
    }

    return ok(sharedRenderResponseSchema.parse({ ...row, outputUrl: row.outputUrl }));
  },
});
