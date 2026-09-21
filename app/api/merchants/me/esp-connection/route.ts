import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';
import { espProviderEnum } from '@/db/schema';
import { espRegistry } from '@/modules/esp';
import { decrypt, encrypt } from '@/lib/crypto';
import { err, ok } from '@/lib/result';
import { childLogger } from '@/lib/log';
import {
  createEspConnections,
  retrieveEspConnections,
  updateEspConnections,
} from '@/actions/esp-connections';

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
      const [connection] = await retrieveEspConnections({ merchantIds: [merchant.merchantId] });
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
        await updateEspConnections([connection.id], { status: 'invalid' });
        return result;
      }

      await updateEspConnections([connection.id], { status: 'active', lastSyncedAt: new Date() });
      return ok({ tested: true });
    }

    if (!body) return err({ code: 'INVALID_INPUT', message: 'missing body' });

    const [existing] = await retrieveEspConnections({ merchantIds: [merchant.merchantId] });

    const apiKeyEncrypted = encrypt(body.apiKey);
    const settings = { abandonedEnabled: body.abandonedEnabled };

    if (existing) {
      await updateEspConnections([existing.id], {
        provider: body.provider,
        apiKeyEncrypted,
        listId: body.listId,
        status: 'active',
        settings,
      });
      return ok({ id: existing.id });
    }

    const [created] = await createEspConnections([
      {
        merchantId: merchant.merchantId,
        provider: body.provider,
        apiKeyEncrypted,
        listId: body.listId,
        settings,
      },
    ]);
    if (!created) return err({ code: 'INTERNAL', message: 'failed to create esp connection' });
    return ok({ id: created.id });
  },
});
