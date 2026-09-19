import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { apiHandler, requireShopperSession } from '@/lib/api-handler';
import { db } from '@/db';
import { leads, links, renders, retargetOptins, shoppers } from '@/db/schema';
import { newId } from '@/lib/ids';
import { err, ok } from '@/lib/result';

const bodySchema = z.object({
  email: z.email(),
  renderId: z.string().min(1),
  // Section 9.8: a SECOND, separately-ticked checkbox — never implied by
  // submitting the email gate itself. Optional/defaulted false so existing
  // callers that predate this field keep working as lead-only submissions.
  retargetOptIn: z.boolean().default(false),
});

// Section 8.3/8.4: `POST /api/leads` — the email gate after the 3rd render
// on a link. One row per (merchant, shopper, product) per section 5's unique
// index; a repeat gate submission updates the email/render rather than
// erroring. Also links the shopper's own cookie to the email (section 8.3:
// "linkshopper cookie to an email") — the closet (`/me`) and every other
// merchant-scoped lead both read from this one write.
export const POST = apiHandler({
  name: 'leads.create',
  auth: ['shopper_session'],
  schema: { body: bodySchema },
  handler: async ({ body, auth, req }) => {
    const shopper = requireShopperSession(auth);
    if (!shopper.ok) return shopper;
    const { shopperId } = shopper.value;

    const [render] = await db
      .select({ productId: renders.productId, linkId: renders.linkId })
      .from(renders)
      .where(eq(renders.id, body.renderId))
      .limit(1);
    if (!render) return err({ code: 'NOT_FOUND', message: 'render not found' });

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

    // Section 14: "No retargeting event or campaign item for a shopper
    // without a live retarget_optins row. No pre-ticked consent." — only
    // written when the (unticked-by-default) checkbox was actually checked.
    // Re-checking after a prior opt-out un-cancels it (opted_out_at cleared)
    // rather than creating a duplicate row, per the unique (shopper, merchant)
    // index already on this table.
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
