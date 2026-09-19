import { db } from '@/db';
import { jobs } from '@/db/schema';
import { newId } from '@/lib/ids';

export async function enqueueJob(type: string, payload: unknown, opts: { runAfter?: Date } = {}) {
  await db.insert(jobs).values({
    id: newId('job'),
    type,
    payload: payload as Record<string, unknown>,
    runAfter: opts.runAfter ?? new Date(),
  });
}
