import 'server-only';

import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { platformRequests } from '@/db/schema';
import type { Platform, PlatformRequest } from '@/db/schema';
import { newId } from '@/lib/ids';

type CreatePlatformRequestInput =
  | {
      kind: 'scraped';
      hostname: string;
      sampleUrl: string;
      detectedPlatform: Platform | null;
      signals: Record<string, unknown>;
      merchantId?: string | null;
    }
  | { kind: 'freetext'; merchantId: string; notes: string };

export async function createPlatformRequests(
  inputs: CreatePlatformRequestInput[],
): Promise<PlatformRequest[]> {
  const results = await Promise.all(
    inputs.map(async (input) => {
      if (input.kind === 'freetext') {
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

      const [existing] = await db
        .select()
        .from(platformRequests)
        .where(eq(platformRequests.hostname, input.hostname))
        .limit(1);

      if (existing) {
        const [updated] = await db
          .update(platformRequests)
          .set({ requestCount: sql`${platformRequests.requestCount} + 1`, updatedAt: new Date() })
          .where(eq(platformRequests.id, existing.id))
          .returning();
        return updated;
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
    }),
  );
  return results.filter((r): r is PlatformRequest => Boolean(r));
}
