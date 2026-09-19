import { eq } from 'drizzle-orm';
import { apiHandler, requireMerchantSession } from '@/lib/api-handler';
import { db } from '@/db';
import { espConnections } from '@/db/schema';
import { espRegistry } from '@/modules/esp';
import { decrypt } from '@/lib/crypto';
import { err, ok } from '@/lib/result';
import { childLogger } from '@/lib/log';

export const POST = apiHandler({
  name: 'merchants.espConnection.test',
  auth: ['merchant_session'],
  handler: async ({ auth, requestId }) => {
    const merchant = requireMerchantSession(auth);
    if (!merchant.ok) return merchant;

    const [connection] = await db
      .select()
      .from(espConnections)
      .where(eq(espConnections.merchantId, merchant.value.merchantId))
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
        email: merchant.value.email,
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
  },
});
