import { db } from '@/db';
import { jobs } from '@/db/schema';
import { newId } from '@/lib/ids';

/**
 * The write half of the DB-backed queue (`drain.ts` is the read/execute
 * half); every module that wants background work done calls this instead of
 * inserting into `jobs` directly.
 */
export async function enqueueJob(type: string, payload: unknown, opts: { runAfter?: Date } = {}) {
  await db.insert(jobs).values({
    id: newId('job'),
    type,
    payload: payload as Record<string, unknown>,
    runAfter: opts.runAfter ?? new Date(),
  });
}
