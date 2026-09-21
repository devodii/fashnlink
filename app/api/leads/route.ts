import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/db';
import { renders } from '@/db/schema';
import { err, ok } from '@/lib/result';
import { updateShoppers } from '@/actions/shoppers';
import { retrieveLinks } from '@/actions/links';
import { createLeads } from '@/actions/leads';
import { createRetargetOptins } from '@/actions/retarget-optins';

const bodySchema = z.object({
  email: z.email(),
  renderId: z.string().min(1),
  /** A second, separately-ticked checkbox; never implied by submitting the email gate itself. */
  retargetOptIn: z.boolean().default(false),
});

export const POST = apiHandler({
  name: 'leads.create',
  auth: ['shopper_session'],
  schema: { body: bodySchema },
  handler: async ({ body, shopper, req }) => {
    const { shopperId } = shopper;

    const [render] = await db
      .select({ productId: renders.productId, linkId: renders.linkId })
      .from(renders)
      .where(eq(renders.id, body.renderId))
      .limit(1);
    if (!render) return err({ code: 'NOT_FOUND', message: 'render not found' });
    if (!render.linkId) return err({ code: 'NOT_FOUND', message: 'render has no link' });

    const [link] = await retrieveLinks({ ids: [render.linkId] });
    if (!link) return err({ code: 'NOT_FOUND', message: 'link not found' });

    await createLeads([
      {
        merchantId: link.merchantId,
        shopperId,
        productId: render.productId,
        renderId: body.renderId,
        email: body.email,
        source: 'email_gate',
      },
    ]);

    await updateShoppers([shopperId], { email: body.email });

    if (body.retargetOptIn) {
      await createRetargetOptins([
        {
          shopperId,
          merchantId: link.merchantId,
          email: body.email,
          source: 'email_gate',
          ip: req.headers.get('x-forwarded-for'),
          userAgent: req.headers.get('user-agent'),
        },
      ]);
    }

    return ok({ recorded: true });
  },
});
