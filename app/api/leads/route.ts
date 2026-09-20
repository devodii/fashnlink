import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/db';
import { leads, links, renders, retargetOptins, shoppers } from '@/db/schema';
import { newId } from '@/lib/ids';
import { err, ok } from '@/lib/result';

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

    const [link] = await db
      .select({ merchantId: links.merchantId })
      .from(links)
      .where(eq(links.id, render.linkId))
      .limit(1);
    if (!link) return err({ code: 'NOT_FOUND', message: 'link not found' });

    await db
      .insert(leads)
      .values({
        id: newId('lead'),
        merchantId: link.merchantId,
        shopperId,
        productId: render.productId,
        renderId: body.renderId,
        email: body.email,
        source: 'email_gate',
      })
      .onConflictDoUpdate({
        target: [leads.merchantId, leads.shopperId, leads.productId],
        set: { email: body.email, renderId: body.renderId },
      });

    await db.update(shoppers).set({ email: body.email }).where(eq(shoppers.id, shopperId));

    if (body.retargetOptIn) {
      await db
        .insert(retargetOptins)
        .values({
          id: newId('optin'),
          shopperId,
          merchantId: link.merchantId,
          email: body.email,
          source: 'email_gate',
          ip: req.headers.get('x-forwarded-for'),
          userAgent: req.headers.get('user-agent'),
        })
        .onConflictDoUpdate({
          target: [retargetOptins.shopperId, retargetOptins.merchantId],
          set: { email: body.email, optedOutAt: null },
        });
    }

    return ok({ recorded: true });
  },
});
