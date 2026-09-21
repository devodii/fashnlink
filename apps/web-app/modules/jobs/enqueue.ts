import { db } from '@/db';
import { jobs } from '@tryonlink/shared/schema';
import { newId } from '@/lib/ids';

export async function enqueueJob(type: string, payload: unknown, opts: { runAfter?: Date } = {}) {
  await db.insert(jobs).values({
    id: newId('job'),
    type,
    payload: payload as Record<string, unknown>,
    runAfter: opts.runAfter ?? new Date(),
  });
}

export async function enqueueJobs(
  entries: { type: string; payload: unknown; runAfter?: Date }[],
): Promise<void> {
  if (entries.length === 0) return;
  await db.insert(jobs).values(
    entries.map((entry) => ({
      id: newId('job'),
      type: entry.type,
      payload: entry.payload as Record<string, unknown>,
      runAfter: entry.runAfter ?? new Date(),
    })),
  );
}
