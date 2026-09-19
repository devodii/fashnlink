import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { platformRequests } from '@/db/schema';
import { newId } from '@/lib/ids';
import type { PlatformKey } from '@/modules/scraper/types';

// Section 6.5's scraper backlog: when `resolveByUrl` lands on `generic` and
// it fails (or the merchant says we got it wrong), we log the hostname here,
// deduplicated. A weekly job (not built yet — Phase M6 cron territory) emails
// the top requested hosts.
export async function recordPlatformRequest(input: {
  hostname: string;
  sampleUrl: string;
  detectedPlatform: PlatformKey | null;
  signals: Record<string, unknown>;
  merchantId?: string | null;
}) {
  const [existing] = await db
    .select()
    .from(platformRequests)
    .where(eq(platformRequests.hostname, input.hostname))
    .limit(1);

  if (existing) {
    await db
      .update(platformRequests)
      .set({ requestCount: sql`${platformRequests.requestCount} + 1`, updatedAt: new Date() })
      .where(eq(platformRequests.id, existing.id));
    return existing;
  }

  const [created] = await db
    .insert(platformRequests)
    .values({
      id: newId('preq'),
      hostname: input.hostname,
      sampleUrl: input.sampleUrl,
      detectedPlatform: input.detectedPlatform,
      signals: input.signals,
      requestCount: 1,
      firstMerchantId: input.merchantId ?? null,
      status: 'open',
    })
    .returning();
  return created;
}
