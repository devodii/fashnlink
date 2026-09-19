import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  creditLedger,
  links,
  merchants,
  products,
  renders,
  shoppers,
  stores,
  twins,
} from '@/db/schema';
import { newId } from '@/lib/ids';
import { currentBalance, reserveRenderCredit, refundFailedRender } from './credit-ledger';

// Integration test against the REAL local Postgres (docker-compose,
// `pnpm db:up`), proving section 7.3's transaction/balance logic end to end
// — no fal/OpenAI calls involved, so nothing here needs a real FAL_KEY.
// Section 4's Adapter/Result philosophy applies to the DB boundary too: this
// is the one thing worth proving against a real transactional database
// rather than a mock.

const TEST_SUFFIX = `m3-ledger-test-${Date.now()}`;

let merchantId: string;
let linkId: string;
let productId: string;
let shopperId: string;
let twinId: string;

afterAll(async () => {
  await db.delete(renders).where(eq(renders.linkId, linkId));
  await db.delete(creditLedger).where(eq(creditLedger.merchantId, merchantId));
  await db.delete(twins).where(eq(twins.id, twinId));
  await db.delete(links).where(eq(links.id, linkId));
  const [product] = await db
    .select({ storeId: products.storeId })
    .from(products)
    .where(eq(products.id, productId));
  await db.delete(products).where(eq(products.id, productId));
  if (product) await db.delete(stores).where(eq(stores.id, product.storeId));
  await db.delete(shoppers).where(eq(shoppers.id, shopperId));
  await db.delete(merchants).where(eq(merchants.id, merchantId));
});

describe('M3 credit ledger transaction against a real local Postgres', () => {
  it('reserves credit, blocks at zero, and refunds a failed render', async () => {
    merchantId = newId('merch');
    await db.insert(merchants).values({
      id: merchantId,
      email: `${TEST_SUFFIX}@example.com`,
      name: 'Ledger Test Merchant',
    });

    const storeId = newId('store');
    await db.insert(stores).values({
      id: storeId,
      merchantId,
      domain: `${TEST_SUFFIX}.example.com`,
      platform: 'shopify',
    });

    productId = newId('prod');
    await db.insert(products).values({
      id: productId,
      storeId,
      externalId: 'ext-1',
      handle: 'test-product',
      title: 'Test Product',
      url: `https://${TEST_SUFFIX}.example.com/products/test`,
      tags: [],
      descriptionText: '',
      available: true,
      eligibility: 'eligible',
    });

    linkId = newId('link');
    await db.insert(links).values({
      id: linkId,
      slug: newId('link').slice(0, 12),
      merchantId,
      productIds: [productId],
    });

    shopperId = newId('shopper');
    await db.insert(shoppers).values({ id: shopperId, cookieId: TEST_SUFFIX });

    twinId = newId('twin');
    await db.insert(twins).values({
      id: twinId,
      shopperId,
      selfieR2Key: 'test/selfie.png',
      selfieUrl: 'https://fake.ufs.sh/f/test-selfie',
      status: 'ready',
    });

    // Grant 2 credits (append-only, matches section 5's `grant_free` reason).
    await db
      .insert(creditLedger)
      .values({ id: newId('ledger'), merchantId, delta: 2, reason: 'grant_free', refAfter: 2 });
    expect(await currentBalance(merchantId)).toBe(2);

    const renderInput = {
      merchantId,
      linkId,
      productId,
      variantId: null,
      shopperId,
      twinId,
      via: 'direct' as const,
    };

    // 1st render: succeeds, balance 2 -> 1.
    const first = await reserveRenderCredit(renderInput);
    expect(first.ok).toBe(true);
    expect(await currentBalance(merchantId)).toBe(1);

    // 2nd render: succeeds, balance 1 -> 0.
    const second = await reserveRenderCredit(renderInput);
    expect(second.ok).toBe(true);
    expect(await currentBalance(merchantId)).toBe(0);

    // 3rd render: blocked, balance stays 0, no render row written.
    const third = await reserveRenderCredit(renderInput);
    expect(third.ok).toBe(false);
    if (!third.ok) expect(third.error.code).toBe('INSUFFICIENT_CREDITS');
    expect(await currentBalance(merchantId)).toBe(0);

    const renderRows = await db.select().from(renders).where(eq(renders.linkId, linkId));
    expect(renderRows.length).toBe(2);

    // Refund the first render: balance 0 -> 1, render row marked failed.
    if (!first.ok) throw new Error('expected first render to have reserved successfully');
    const refund = await refundFailedRender(merchantId, first.value.renderId);
    expect(refund.ok).toBe(true);
    expect(await currentBalance(merchantId)).toBe(1);

    const [failedRender] = await db
      .select()
      .from(renders)
      .where(eq(renders.id, first.value.renderId));
    expect(failedRender?.status).toBe('failed');

    const ledgerRows = await db
      .select()
      .from(creditLedger)
      .where(eq(creditLedger.merchantId, merchantId));
    expect(ledgerRows.filter((r) => r.reason === 'refund_failed_render').length).toBe(1);
  });
});
