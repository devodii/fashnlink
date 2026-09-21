import 'server-only';

import { inArray } from 'drizzle-orm';
import { db } from '@/db';
import { espConnections } from '@tryonlink/shared/schema';
import type { EspConnection } from '@tryonlink/shared/schema';
import { newId } from '@/lib/ids';

type CreateEspConnectionInput = Pick<
  EspConnection,
  'merchantId' | 'provider' | 'apiKeyEncrypted' | 'listId'
> & {
  settings?: Record<string, unknown>;
};

export async function createEspConnections(
  inputs: CreateEspConnectionInput[],
): Promise<EspConnection[]> {
  if (inputs.length === 0) return [];
  return db
    .insert(espConnections)
    .values(
      inputs.map((input) => ({
        id: newId('esp'),
        merchantId: input.merchantId,
        provider: input.provider,
        apiKeyEncrypted: input.apiKeyEncrypted,
        listId: input.listId,
        settings: input.settings ?? {},
      })),
    )
    .returning();
}

export async function retrieveEspConnections(filters: {
  merchantIds?: string[];
}): Promise<EspConnection[]> {
  if (!filters.merchantIds?.length) return [];
  return db
    .select()
    .from(espConnections)
    .where(inArray(espConnections.merchantId, filters.merchantIds));
}

export async function updateEspConnections(
  ids: string[],
  patch: Partial<
    Pick<EspConnection, 'provider' | 'apiKeyEncrypted' | 'listId' | 'status' | 'lastSyncedAt'>
  > & { settings?: Record<string, unknown> },
): Promise<EspConnection[]> {
  if (ids.length === 0 || Object.keys(patch).length === 0) return [];
  return db.update(espConnections).set(patch).where(inArray(espConnections.id, ids)).returning();
}

export async function deleteEspConnections(filters: {
  merchantIds: string[];
}): Promise<{ deletedCount: number }> {
  if (filters.merchantIds.length === 0) return { deletedCount: 0 };
  const deleted = await db
    .delete(espConnections)
    .where(inArray(espConnections.merchantId, filters.merchantIds))
    .returning();
  return { deletedCount: deleted.length };
}
