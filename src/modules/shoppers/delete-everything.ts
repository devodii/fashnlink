import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { campaignItems, renders, shoppers, twins } from '@/db/schema';
import { deleteObjects } from '@/modules/storage';
import { childLogger } from '@/lib/log';

const log = childLogger('shoppers.delete-everything');

export async function deleteEverythingForShopper(shopperId: string): Promise<void> {
  const shopperTwins = await db
    .select({ id: twins.id, selfieR2Key: twins.selfieR2Key, twinR2Key: twins.twinR2Key })
    .from(twins)
    .where(eq(twins.shopperId, shopperId));

  if (shopperTwins.length > 0) {
    const twinKeys = shopperTwins.flatMap((twin) =>
      [twin.selfieR2Key, twin.twinR2Key].filter((key): key is string => !!key),
    );
    await deleteObjects(twinKeys).catch((cause) =>
      log.error(
        { cause, shopperId, count: twinKeys.length },
        'failed to delete twin images during shopper erasure',
      ),
    );
    await db.delete(twins).where(eq(twins.shopperId, shopperId));
  }

  await db
    .delete(campaignItems)
    .where(and(eq(campaignItems.shopperId, shopperId), eq(campaignItems.status, 'pending')));

  const shopperRenders = await db
    .select({ id: renders.id, outputR2Key: renders.outputR2Key })
    .from(renders)
    .where(eq(renders.shopperId, shopperId));

  if (shopperRenders.length > 0) {
    const renderKeys = shopperRenders
      .map((render) => render.outputR2Key)
      .filter((key): key is string => !!key);
    await deleteObjects(renderKeys).catch((cause) =>
      log.error(
        { cause, shopperId, count: renderKeys.length },
        'failed to delete render images during erasure',
      ),
    );

    const renderIds = shopperRenders.map((render) => render.id);
    await db
      .update(renders)
      .set({ outputR2Key: null, outputUrl: null })
      .where(inArray(renders.id, renderIds));
  }

  await db
    .update(shoppers)
    .set({ deletedAt: new Date(), email: null })
    .where(eq(shoppers.id, shopperId));
}
