import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { campaignItems, renders, retargetOptins, shoppers, twins } from '@/db/schema';
import type { ResolvedShopper, Shopper } from '@/db/schema';
import { newId } from '@/lib/ids';
import { env } from '@/lib/env';
import { childLogger } from '@/lib/log';
import { deleteObjects } from '@/modules/storage';
import { deleteTwins } from '@/actions/twins';

const log = childLogger('actions.shoppers');

const COOKIE_NAME = 'shopper_id';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

function sign(shopperId: string): string {
  const mac = createHmac('sha256', env.APP_SECRET).update(shopperId).digest('base64url');
  return `${shopperId}.${mac}`;
}

function verify(token: string): string | null {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const shopperId = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = createHmac('sha256', env.APP_SECRET).update(shopperId).digest('base64url');

  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return shopperId;
}

async function verifiedCookieShopperId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  return raw ? verify(raw) : null;
}

export async function createShoppers(): Promise<string> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  const existing = raw ? verify(raw) : null;
  if (existing) return existing;

  const shopperId = newId('shopper');
  await db.insert(shoppers).values({ id: shopperId, cookieId: shopperId });

  store.set(COOKIE_NAME, sign(shopperId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });

  return shopperId;
}

type RetrieveShoppersFilters =
  | { cookieOnly: true }
  | { cookieOnly?: false; ids?: string[]; retargetOptedInMerchantId?: undefined }
  | { retargetOptedInMerchantId: string; cookieOnly?: undefined; ids?: undefined };
type RetrieveShoppersResult<F extends RetrieveShoppersFilters> = F extends { cookieOnly: true }
  ? { shopperId: string | null }
  : F extends { retargetOptedInMerchantId: string }
    ? ResolvedShopper[]
    : Shopper[];

export async function retrieveShoppers<F extends RetrieveShoppersFilters>(
  filters: F,
): Promise<RetrieveShoppersResult<F>> {
  if (filters.cookieOnly) {
    return { shopperId: await verifiedCookieShopperId() } as RetrieveShoppersResult<F>;
  }

  if (filters.retargetOptedInMerchantId) {
    const rows = await db
      .select({ shopper: shoppers, twinId: twins.id, twinUrl: twins.twinUrl })
      .from(retargetOptins)
      .innerJoin(shoppers, eq(shoppers.id, retargetOptins.shopperId))
      .innerJoin(
        twins,
        and(eq(twins.shopperId, shoppers.id), eq(twins.isDefault, true), eq(twins.status, 'ready')),
      )
      .where(
        and(
          eq(retargetOptins.merchantId, filters.retargetOptedInMerchantId),
          isNull(retargetOptins.optedOutAt),
        ),
      );
    return rows.map(({ shopper, twinId, twinUrl }) => ({
      ...shopper,
      twinId,
      twinUrl,
    })) as RetrieveShoppersResult<F>;
  }

  const ids = filters.ids?.length
    ? filters.ids
    : [await verifiedCookieShopperId()].filter((id): id is string => Boolean(id));
  if (ids.length === 0) return [] as unknown as RetrieveShoppersResult<F>;

  return (await db
    .select()
    .from(shoppers)
    .where(inArray(shoppers.id, ids))) as RetrieveShoppersResult<F>;
}

export async function updateShoppers(
  ids: string[],
  patch: Partial<
    Pick<Shopper, 'email' | 'consentAt' | 'ageAttestedAt' | 'deletedAt' | 'sourceRenderId'>
  >,
): Promise<Shopper[]> {
  if (ids.length === 0 || Object.keys(patch).length === 0) return [];
  return db.update(shoppers).set(patch).where(inArray(shoppers.id, ids)).returning();
}

export async function deleteShoppers(ids: string[]): Promise<{ deletedCount: number }> {
  if (ids.length === 0) return { deletedCount: 0 };

  await deleteTwins({ shopperIds: ids });

  await db
    .delete(campaignItems)
    .where(and(inArray(campaignItems.shopperId, ids), eq(campaignItems.status, 'pending')));

  const shopperRenders = await db
    .select({ id: renders.id, outputR2Key: renders.outputR2Key })
    .from(renders)
    .where(inArray(renders.shopperId, ids));

  if (shopperRenders.length > 0) {
    const renderKeys = shopperRenders
      .map((render) => render.outputR2Key)
      .filter((key): key is string => Boolean(key));
    await deleteObjects(renderKeys).catch((cause) =>
      log.error(
        { cause, count: renderKeys.length },
        'failed to delete render images during erasure',
      ),
    );

    await db
      .update(renders)
      .set({ outputR2Key: null, outputUrl: null })
      .where(
        inArray(
          renders.id,
          shopperRenders.map((render) => render.id),
        ),
      );
  }

  await updateShoppers(ids, { deletedAt: new Date(), email: null });
  return { deletedCount: ids.length };
}
