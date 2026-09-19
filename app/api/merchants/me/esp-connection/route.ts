import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { apiHandler, requireMerchantSession } from '@/lib/api-handler';
import { db } from '@/db';
import { espConnections, espProviderEnum } from '@/db/schema';
import { newId } from '@/lib/ids';
import { encrypt } from '@/lib/crypto';
import { ok } from '@/lib/result';

const bodySchema = z.object({
  provider: z.enum(espProviderEnum.enumValues),
  apiKey: z.string().min(1),
  listId: z.string().nullable().default(null),
  // Section 9.8: "toggle 'Abandoned try-on events' on/off". Defaults true on
  // first connect — a merchant who just connected an ESP is opting into the
  // feature the connect form exists for.
  abandonedEnabled: z.boolean().default(true),
});

// Section 8.2/9.8: `/dashboard/retargeting`'s "connect Klaviyo/Mailchimp"
// form. One connection per merchant (no multi-ESP support in v1) — a
// reconnect replaces the encrypted key and provider rather than adding a
// second row.
export const POST = apiHandler({
  name: 'merchants.espConnection.upsert',
  auth: ['merchant_session'],
  schema: { body: bodySchema },
  handler: async ({ body, auth }) => {
    const merchant = requireMerchantSession(auth);
    if (!merchant.ok) return merchant;

    const [existing] = await db
      .select({ id: espConnections.id })
      .from(espConnections)
      .where(eq(espConnections.merchantId, merchant.value.merchantId))
      .limit(1);

    const apiKeyEncrypted = encrypt(body.apiKey);

    const settings = { abandonedEnabled: body.abandonedEnabled };

    if (existing) {
      await db
        .update(espConnections)
        .set({
          provider: body.provider,
          apiKeyEncrypted,
          listId: body.listId,
          status: 'active',
          settings,
        })
        .where(eq(espConnections.id, existing.id));
      return ok({ id: existing.id });
    }

    const id = newId('esp');
    await db.insert(espConnections).values({
      id,
      merchantId: merchant.value.merchantId,
      provider: body.provider,
      apiKeyEncrypted,
      listId: body.listId,
      settings,
    });
    return ok({ id });
  },
});
