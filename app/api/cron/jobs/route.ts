import { NextResponse } from 'next/server';
import { drainJobs } from '@/modules/jobs';
import { createFetch } from '@/lib/http';
import { childLogger } from '@/lib/log';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

// Vercel Cron (section 8.4), protected by CRON_SECRET. Drains up to 50 due
// jobs per tick; the handler registry it dispatches into starts empty and
// fills in as later modules register their job types (section 12 M1 accept).
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Unauthorized' } }, { status: 401 });
  }

  const requestId = crypto.randomUUID();
  const log = childLogger(requestId, { route: 'cron/jobs' });
  const ctx = { log, requestId, deadlineMs: Date.now() + 55_000, fetch: createFetch({ log }) };

  const summary = await drainJobs(ctx);
  log.info(summary, 'jobs drained');

  return NextResponse.json({ ok: true, value: summary }, { headers: { 'cache-control': 'no-store' } });
}
