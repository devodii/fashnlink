import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { platformRequests } from '@/db/schema';
import { newId } from '@/lib/ids';
import type { PlatformKey } from '@/modules/scraper/types';

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

// hostname is NOT NULL + unique on this table, so a synthetic per-merchant
// placeholder stands in since free-text requests have no real hostname.
export async function recordFreeTextPlatformRequest(input: { merchantId: string; notes: string }) {
  const [created] = await db
    .insert(platformRequests)
    .values({
      id: newId('preq'),
      hostname: `freetext:${input.merchantId}:${Date.now()}`,
      sampleUrl: null,
      detectedPlatform: null,
      signals: {},
      requestCount: 1,
      firstMerchantId: input.merchantId,
      status: 'open',
      notes: input.notes,
    })
    .returning();
  return created;
}
