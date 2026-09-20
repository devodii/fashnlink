import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/db';
import { espConnections, espProviderEnum } from '@/db/schema';
import { espRegistry } from '@/modules/esp';
import { newId } from '@/lib/ids';
import { decrypt, encrypt } from '@/lib/crypto';
import { err, ok } from '@/lib/result';
import { childLogger } from '@/lib/log';

const bodySchema = z.object({
  provider: z.enum(espProviderEnum.enumValues),
  apiKey: z.string().min(1),
  listId: z.string().nullable().default(null),
  abandonedEnabled: z.boolean().default(true),
});

const querySchema = z.object({
  test: z.coerce.boolean().default(false),
});

export const POST = apiHandler({
  name: 'merchants.espConnection.upsert',
  auth: ['merchant_session'],
  schema: { body: bodySchema.optional(), query: querySchema },
  handler: async ({ body, query, merchant, requestId }) => {
    if (query.test) {
      const [connection] = await db
        .select()
        .from(espConnections)
        .where(eq(espConnections.merchantId, merchant.merchantId))
        .limit(1);
      if (!connection) return err({ code: 'NOT_FOUND', message: 'no esp connection to test' });

      const adapter = espRegistry.get(connection.provider);
      if (!adapter) return err({ code: 'INTERNAL', message: 'unknown esp provider' });

      const log = childLogger(requestId, { route: 'merchants.espConnection.test' });
      const result = await adapter.run(
        {
          op: 'test',
          apiKey: decrypt(connection.apiKeyEncrypted),
          listId: connection.listId,
          email: merchant.email,
        },
        { log, requestId, deadlineMs: Date.now() + 15_000, fetch: globalThis.fetch },
      );

      if (!result.ok) {
        await db
          .update(espConnections)
          .set({ status: 'invalid' })
          .where(eq(espConnections.id, connection.id));
        return result;
      }

      await db
        .update(espConnections)
        .set({ status: 'active', lastSyncedAt: new Date() })
        .where(eq(espConnections.id, connection.id));
      return ok({ tested: true });
    }

    if (!body) return err({ code: 'INVALID_INPUT', message: 'missing body' });

    const [existing] = await db
      .select({ id: espConnections.id })
      .from(espConnections)
      .where(eq(espConnections.merchantId, merchant.merchantId))
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
      merchantId: merchant.merchantId,
      provider: body.provider,
      apiKeyEncrypted,
      listId: body.listId,
      settings,
    });
    return ok({ id });
  },
});
