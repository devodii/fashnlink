import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  campaignItems,
  campaigns,
  creditLedger,
  merchants,
  products,
  productImages,
  retargetOptins,
  shoppers,
  stores,
  twins,
} from '@/db/schema';
import { newId } from '@/lib/ids';
import { estimateDrop, createDrop } from './create';
import { checkCampaignHealth } from './finalize';
import { currentBalance } from '@/modules/render/credit-ledger';

// Integration test against the REAL local Postgres, proving section 9.8's
// new-drop lifecycle end to end: audience estimation -> credit reservation
// -> campaign_items fan-out -> (simulated) resolution -> unused-credit
// release. No fal/OpenAI/ESP calls — `checkCampaignHealth`'s ESP push is
// exercised with no `esp_connections` row for this merchant, so it correctly
// no-ops on that step (proven in the abandoned-cron integration work) while
// everything DB-side still runs for real.

const SUFFIX = `m7-drop-test-${Date.now()}`;
let merchantId: string;
let storeId: string;
const productIds: string[] = [];
const shopperIds: string[] = [];

afterAll(async () => {
  await db.delete(campaignItems).where(eq(campaignItems.campaignId, campaignIdHolder.id ?? ''));
  await db.delete(campaigns).where(eq(campaigns.merchantId, merchantId));
  await db.delete(creditLedger).where(eq(creditLedger.merchantId, merchantId));
  for (const pid of productIds) {
    await db.delete(productImages).where(eq(productImages.productId, pid));
    await db.delete(products).where(eq(products.id, pid));
  }
  await db.delete(stores).where(eq(stores.id, storeId));
  await db.delete(retargetOptins).where(eq(retargetOptins.merchantId, merchantId));
  for (const sid of shopperIds) {
    await db.delete(twins).where(eq(twins.shopperId, sid));
    await db.delete(shoppers).where(eq(shoppers.id, sid));
  }
  await db.delete(merchants).where(eq(merchants.id, merchantId));
});

const campaignIdHolder: { id: string | null } = { id: null };

describe('M7 new-drop campaign lifecycle against a real local Postgres', () => {
  it('estimates, reserves credits, fans out items, and releases unused credit on finalize', async () => {
    merchantId = newId('merch');
    await db
      .insert(merchants)
      .values({ id: merchantId, email: `${SUFFIX}@example.com`, name: 'Drop Test Merchant' });
    await db
      .insert(creditLedger)
      .values({ id: newId('ledger'), merchantId, delta: 20, reason: 'grant_free', refAfter: 20 });

    storeId = newId('store');
    await db
      .insert(stores)
      .values({ id: storeId, merchantId, domain: `${SUFFIX}.example.com`, platform: 'shopify' });

    for (let i = 0; i < 2; i++) {
      const productId = newId('prod');
      productIds.push(productId);
      await db.insert(products).values({
        id: productId,
        storeId,
        externalId: `ext-${i}`,
        handle: `product-${i}`,
        title: `Test Product ${i}`,
        url: `https://${SUFFIX}.example.com/products/${i}`,
        tags: [],
        descriptionText: '',
        available: true,
        eligibility: 'eligible',
        garmentCategory: 'top',
      });
      await db.insert(productImages).values({
        id: newId('img'),
        productId,
        r2Key: `products/${SUFFIX}/${i}.jpg`,
        url: `https://fake.ufs.sh/f/products/${SUFFIX}/${i}.jpg`,
        position: 0,
        isTryonSource: true,
        role: 'flat_lay',
      });
    }

    // 3 opted-in shoppers, but only 2 have a ready DEFAULT twin — the 3rd
    // proves the audience query correctly excludes a not-ready twin.
    for (let i = 0; i < 3; i++) {
      const shopperId = newId('shopper');
      shopperIds.push(shopperId);
      await db
        .insert(shoppers)
        .values({ id: shopperId, cookieId: `${SUFFIX}-${i}`, email: `${SUFFIX}-${i}@example.com` });
      await db.insert(twins).values({
        id: newId('twin'),
        shopperId,
        selfieR2Key: `selfies/${SUFFIX}-${i}.jpg`,
        selfieUrl: `https://fake.ufs.sh/f/selfies/${SUFFIX}-${i}.jpg`,
        twinUrl: i < 2 ? `https://fake.ufs.sh/f/twins/${SUFFIX}-${i}.jpg` : null,
        status: i < 2 ? 'ready' : 'pending',
        isDefault: true,
      });
      await db.insert(retargetOptins).values({
        id: newId('optin'),
        shopperId,
        merchantId,
        email: `${SUFFIX}-${i}@example.com`,
        source: 'email_gate',
      });
    }

    const estimate = await estimateDrop(merchantId, productIds);
    expect(estimate.ok).toBe(true);
    if (!estimate.ok) return;
    expect(estimate.value.audienceCount).toBe(2); // the 3rd shopper's twin isn't ready
    expect(estimate.value.itemCount).toBe(4); // 2 shoppers x 2 products
    expect(estimate.value.estimatedCredits).toBe(4);

    const balanceBefore = await currentBalance(merchantId);
    expect(balanceBefore).toBe(20);

    const created = await createDrop(merchantId, productIds);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    campaignIdHolder.id = created.value.campaignId;
    expect(created.value.itemCount).toBe(4);

    // 4 credits reserved up front.
    expect(await currentBalance(merchantId)).toBe(16);

    const items = await db
      .select()
      .from(campaignItems)
      .where(eq(campaignItems.campaignId, created.value.campaignId));
    expect(items.length).toBe(4);
    expect(items.every((i) => i.status === 'pending')).toBe(true);

    // Simulate resolution the way the fal webhook / job handler would:
    // 2 items succeed, 2 fail (never actually rendered) — proving
    // checkCampaignHealth's finalize path releases the unused portion.
    await db
      .update(campaignItems)
      .set({ status: 'rendered' })
      .where(eq(campaignItems.id, items[0].id));
    await db
      .update(campaignItems)
      .set({ status: 'rendered' })
      .where(eq(campaignItems.id, items[1].id));
    await db
      .update(campaignItems)
      .set({ status: 'failed', skipReason: 'test failure' })
      .where(eq(campaignItems.id, items[2].id));
    await db
      .update(campaignItems)
      .set({ status: 'skipped', skipReason: 'test skip' })
      .where(eq(campaignItems.id, items[3].id));

    await checkCampaignHealth(created.value.campaignId);

    // 2 failed/skipped items' reserved credits released back.
    expect(await currentBalance(merchantId)).toBe(18);

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, created.value.campaignId));
    expect(campaign.status).toBe('ready');

    const ledgerRows = await db
      .select()
      .from(creditLedger)
      .where(eq(creditLedger.merchantId, merchantId));
    const reserveRows = ledgerRows.filter((r) => r.reason === 'campaign_reserve');
    expect(reserveRows.length).toBe(2); // one -4 reservation, one +2 release
  });
});
