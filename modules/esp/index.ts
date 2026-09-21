import { AdapterRegistry } from '@/lib/adapter';
import type { Ctx } from '@/lib/adapter';
import { decrypt } from '@/lib/crypto';
import { err, type Result } from '@/lib/result';
import { retrieveEspConnections } from '@/actions/esp-connections';
import { klaviyoAdapter } from './adapters/klaviyo';
import { mailchimpAdapter } from './adapters/mailchimp';
import type { EspPush, EspPushResult } from './types';

export const espRegistry = new AdapterRegistry<EspPush, EspPushResult, 'klaviyo' | 'mailchimp'>([
  klaviyoAdapter,
  mailchimpAdapter,
]);

export type { EspPush, EspPushResult } from './types';

// A plain Omit<EspPush, ...> would collapse this discriminated union into one
// flattened type, losing the connection between `op` and its matching
// fields. Distributing the Omit across each union member with a conditional
// type keeps full narrowing on `op` for callers.
type EspPushWithoutCredentials<T> = T extends EspPush ? Omit<T, 'apiKey' | 'listId'> : never;

export async function pushToMerchantEsp(
  merchantId: string,
  push: EspPushWithoutCredentials<EspPush>,
  ctx: Ctx,
): Promise<Result<EspPushResult>> {
  const [connection] = await retrieveEspConnections({ merchantIds: [merchantId] });

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
