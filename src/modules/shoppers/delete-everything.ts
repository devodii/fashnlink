import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { renders, shoppers, twins } from '@/db/schema';
import { deleteObject } from '@/modules/storage';
import { childLogger } from '@/lib/log';

const log = childLogger('shoppers.delete-everything');

// Section 7.4: "delete button that actually delete[s] from R2 [now
// UploadThing] and DB." Photos are hard-deleted (selfie + generated twin);
// renders keep their row as a tombstone with the image reference cleared
// (section 7.4's exact wording), not deleted outright — the merchant-side
// aggregate counts (render_count, credit ledger) stay accurate. The
// `shoppers` row itself is soft-deleted (`deletedAt`, section 5 already has
// the column) rather than hard-deleted, matching every other table's
// soft-delete convention; email is cleared since it's the one piece of PII
// on that row.
export async function deleteEverythingForShopper(shopperId: string): Promise<void> {
  const shopperTwins = await db
    .select({ id: twins.id, selfieR2Key: twins.selfieR2Key, twinR2Key: twins.twinR2Key })
    .from(twins)
    .where(eq(twins.shopperId, shopperId));

  for (const twin of shopperTwins) {
    await deleteObject(twin.selfieR2Key).catch((cause) =>
      log.error({ cause, twinId: twin.id }, 'failed to delete selfie during shopper erasure'),
    );
    if (twin.twinR2Key) {
      await deleteObject(twin.twinR2Key).catch((cause) =>
        log.error({ cause, twinId: twin.id }, 'failed to delete twin image during shopper erasure'),
      );
    }
  }
  if (shopperTwins.length > 0) {
    await db.delete(twins).where(eq(twins.shopperId, shopperId));
  }

  const shopperRenders = await db
    .select({ id: renders.id, outputR2Key: renders.outputR2Key })
    .from(renders)
    .where(eq(renders.shopperId, shopperId));

  for (const render of shopperRenders) {
    if (!render.outputR2Key) continue;
    await deleteObject(render.outputR2Key).catch((cause) =>
      log.error({ cause, renderId: render.id }, 'failed to delete render image during erasure'),
    );
    await db
      .update(renders)
      .set({ outputR2Key: null, outputUrl: null })
      .where(eq(renders.id, render.id));
  }

  await db
    .update(shoppers)
    .set({ deletedAt: new Date(), email: null })
    .where(eq(shoppers.id, shopperId));
}
