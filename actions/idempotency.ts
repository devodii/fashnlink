import 'server-only';

import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { idempotencyKeys } from '@/db/schema';

export type IdempotencyLookup =
  { done: true; status: number; body: unknown } | { done: false } | null;

export async function getStoredIdempotentResponse(
  key: string,
  actorId: string,
): Promise<IdempotencyLookup> {
  const [row] = await db
    .select()
    .from(idempotencyKeys)
    .where(and(eq(idempotencyKeys.key, key), eq(idempotencyKeys.actorId, actorId)))
    .limit(1);
  if (!row) return null;
  if (row.responseStatus !== null)
    return { done: true, status: row.responseStatus, body: row.responseBody };

  const lockAgeMs = Date.now() - row.lockedAt.getTime();
  if (lockAgeMs > 60_000) {
    await db
      .delete(idempotencyKeys)
      .where(and(eq(idempotencyKeys.key, key), eq(idempotencyKeys.actorId, actorId)));
    return null;
  }
  return { done: false };
}

export async function tryAcquireIdempotencyLock(
  key: string,
  actorId: string,
  route: string,
): Promise<boolean> {
  const inserted = await db
    .insert(idempotencyKeys)
    .values({ key, actorId, route })
    .onConflictDoNothing({ target: [idempotencyKeys.key, idempotencyKeys.actorId] })
    .returning({ key: idempotencyKeys.key });
  return inserted.length > 0;
}

export async function saveIdempotentResult(
  key: string,
  actorId: string,
  status: number,
  body: unknown,
): Promise<void> {
  await db
    .update(idempotencyKeys)
    .set({ responseStatus: status, responseBody: body as object })
    .where(and(eq(idempotencyKeys.key, key), eq(idempotencyKeys.actorId, actorId)));
}

export async function releaseIdempotencyLock(key: string, actorId: string): Promise<void> {
  await db
    .delete(idempotencyKeys)
    .where(and(eq(idempotencyKeys.key, key), eq(idempotencyKeys.actorId, actorId)));
}
