import { AdapterRegistry } from '@/lib/adapter';
import type { Ctx } from '@/lib/adapter';
import { decrypt } from '@/lib/crypto';
import { err, ok, type Result } from '@/lib/result';
import { db } from '@/db';
import { espConnections } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { klaviyoAdapter } from './adapters/klaviyo';
import { mailchimpAdapter } from './adapters/mailchimp';
import type { EspPush, EspPushResult } from './types';

export const espRegistry = new AdapterRegistry<EspPush, EspPushResult, 'klaviyo' | 'mailchimp'>([
  klaviyoAdapter,
  mailchimpAdapter,
]);

export type { EspPush, EspPushResult, EspProviderKey } from './types';

// The single entry point everywhere else in the app should use — looks up
// the merchant's active connection, decrypts the key, and dispatches through
// the registry. Callers never touch `apiKeyEncrypted` or an adapter directly.
// A plain `Omit<EspPush, ...>` would collapse the discriminated union into
// one flattened object type, losing the connection between `op` and its
// matching fields — this distributes the Omit across each union member
// instead, so callers still get full narrowing on `op`.
type EspPushWithoutCredentials<T> = T extends EspPush ? Omit<T, 'apiKey' | 'listId'> : never;

export async function pushToMerchantEsp(
  merchantId: string,
  push: EspPushWithoutCredentials<EspPush>,
  ctx: Ctx,
): Promise<Result<EspPushResult>> {
  const [connection] = await db
    .select()
    .from(espConnections)
    .where(eq(espConnections.merchantId, merchantId))
    .limit(1);

  if (!connection || connection.status !== 'active') {
    return err({ code: 'NOT_FOUND', message: 'no active esp connection for this merchant' });
  }

  const adapter = espRegistry.get(connection.provider);
  if (!adapter) {
    return err({
      code: 'INTERNAL',
      message: `no esp adapter registered for ${connection.provider}`,
    });
  }

  const apiKey = decrypt(connection.apiKeyEncrypted);
  return adapter.run({ ...push, apiKey, listId: connection.listId } as EspPush, ctx);
}
