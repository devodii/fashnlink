import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { jobs } from '@/db/schema';
import type { Ctx } from '@/lib/adapter';
import { getJobHandler } from './registry';

const BATCH_SIZE = 50;
// A job whose handler crashed (function timeout, server restart) mid-run
// leaves status='running' with nothing to ever revisit it. Anything still
// 'running' past this age is treated as stuck and reclaimed for retry, up
// to MAX_ATTEMPTS, past which it's given up on rather than retried forever.
const STALE_RUNNING_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export type DrainSummary = {
  claimed: number;
  succeeded: number;
  failed: number;
  skipped: number;
};

// FOR UPDATE SKIP LOCKED so concurrent drain calls never claim the same row.
export async function drainJobs(ctx: Ctx): Promise<DrainSummary> {
  await db.execute(sql`
    UPDATE ${jobs}
    SET status = 'failed', last_error = 'stuck in running past max attempts', updated_at = now()
    WHERE status = 'running'
      AND locked_at < now() - (${STALE_RUNNING_MS}::text || ' milliseconds')::interval
      AND attempts >= ${MAX_ATTEMPTS}
  `);

  const claimed = await db.execute<typeof jobs.$inferSelect>(sql`
    UPDATE ${jobs}
    SET status = 'running', locked_at = now(), attempts = attempts + 1, updated_at = now()
    WHERE id IN (
      SELECT id FROM ${jobs}
      WHERE (status = 'queued' AND run_after <= now())
         OR (
           status = 'running'
           AND locked_at < now() - (${STALE_RUNNING_MS}::text || ' milliseconds')::interval
           AND attempts < ${MAX_ATTEMPTS}
         )
      ORDER BY run_after
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `);

  const rows = claimed.rows as unknown as (typeof jobs.$inferSelect)[];
  const summary: DrainSummary = { claimed: rows.length, succeeded: 0, failed: 0, skipped: 0 };

  for (const job of rows) {
    const handler = getJobHandler(job.type);
    if (!handler) {
      summary.skipped++;
      await db
        .update(jobs)
        .set({
          status: 'failed',
          lastError: `No handler registered for job type "${job.type}"`,
          updatedAt: new Date(),
        })
        .where(sql`${jobs.id} = ${job.id}`);
      continue;
    }

    const result = await handler(job.payload).catch((cause) => ({
      ok: false as const,
      error: { code: 'INTERNAL' as const, message: 'Job handler threw', cause },
    }));

    if (result.ok) {
      summary.succeeded++;
      await db
        .update(jobs)
        .set({ status: 'succeeded', updatedAt: new Date() })
        .where(sql`${jobs.id} = ${job.id}`);
    } else {
      summary.failed++;
      ctx.log.error({ jobId: job.id, type: job.type, error: result.error }, 'job failed');
      await db
        .update(jobs)
        .set({ status: 'failed', lastError: result.error.message, updatedAt: new Date() })
        .where(sql`${jobs.id} = ${job.id}`);
    }
  }

  return summary;
}
