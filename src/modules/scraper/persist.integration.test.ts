import { afterAll, describe, expect, it, vi } from 'vitest';

// Integration test against the REAL local Postgres (docker-compose,
// `pnpm db:up`) proving the persistence half of the M2 pipeline end to end:
// enrichment -> product/image/variant rows. `putObject` (UploadThing) and the
// image fetch are mocked — this sandbox has no real UPLOADTHING_TOKEN/
// OPENAI_API_KEY (`.env.local` has dev placeholders), so the two external
// SaaS calls (OpenAI vision, UploadThing upload) can't be exercised live end
// to end. The image fetch is mocked too (a real locally-generated PNG, not a
// network call) — section 6.9/2's "no network in the test suite" rule
// applies here just as much as to adapter fixtures; an earlier version of
// this test hit a real `picsum.photos` URL, which worked against this
// sandbox's network but is exactly the kind of external dependency that made
// CI flaky/environment-dependent, so it's gone.
// `scrapeUrl` itself IS proven live in `pnpm demo:scrape` against real
// stores, up through the wearable gate call — see the M2 report for the
// `not_wearable` rejection path, which needs no external API key at all and
// was verified against a real live Shopify store with zero DB rows written.
vi.mock('@/modules/storage', () => ({
  putObject: vi.fn(async (key: string) => ({
    key,
    url: `https://fake.ufs.sh/f/${key}`,
  })),
}));

import sharp from 'sharp';
import { db } from '@/db';
import { products, productImages, productVariants, stores } from '@/db/schema';
import { newId } from '@/lib/ids';
import { childLogger } from '@/lib/log';
import { findOrCreateStore } from '@/db/repos/stores';
import {
  findProductByExternalId,
  replaceProductImages,
  replaceProductVariants,
  upsertProduct,
} from '@/db/repos/products';
import { enrichProduct } from './enrich';
import type { NormalizedProduct } from './schema';
import type { FinalWearabilityVerdict, ImageVisionVerdict } from '@/config/wearable-rules';
import { eq } from 'drizzle-orm';

const TEST_DOMAIN = `m2-integration-test-${Date.now()}.example.com`;

afterAll(async () => {
  const store = await db.select().from(stores).where(eq(stores.domain, TEST_DOMAIN)).limit(1);
  if (store[0]) {
    const productRows = await db.select().from(products).where(eq(products.storeId, store[0].id));
    for (const product of productRows) {
      await db.delete(productImages).where(eq(productImages.productId, product.id));
      await db.delete(productVariants).where(eq(productVariants.productId, product.id));
    }
    await db.delete(products).where(eq(products.storeId, store[0].id));
    await db.delete(stores).where(eq(stores.id, store[0].id));
  }
});

describe('M2 persistence pipeline against a real local Postgres', () => {
  it('enriches and persists a product with images and variants', async () => {
    const store = await findOrCreateStore({
      domain: TEST_DOMAIN,
      platform: 'shopify',
      fingerprint: {},
    });
    expect(store).toBeTruthy();
    if (!store) return;

    const normalized: NormalizedProduct = {
      externalId: 'test-ext-1',
      handle: 'test-cardigan',
      title: 'Test Cardigan',
      url: `https://${TEST_DOMAIN}/products/test-cardigan`,
      buyUrl: `https://${TEST_DOMAIN}/cart/123:1`,
      brand: 'Test Brand',
      productType: 'Cardigans',
      tags: ['wool'],
      descriptionText: 'A warm wool cardigan.',
      priceCents: 12800,
      currency: 'USD',
      available: true,
      images: [
        {
          url: 'https://picsum.photos/seed/cardigan1/400/500',
          alt: null,
          width: 400,
          height: 500,
          position: 0,
          variantIds: [],
        },
      ],
      variants: [
        {
          externalId: 'v1',
          sku: 'SKU1',
          size: 'M',
          color: 'Oatmeal',
          other: null,
          priceCents: 12800,
          available: true,
          imageUrl: null,
        },
      ],
      options: [{ name: 'Size', values: ['M'] }],
      externalUpdatedAt: null,
      raw: {},
    };

    const verdict: FinalWearabilityVerdict = {
      eligibility: 'eligible',
      eligibilityReason: 'test',
      wearableType: 'garment',
      garmentCategory: 'outerwear',
      tryonSourceIndex: 0,
    };
    const perImageVisionVerdicts: (ImageVisionVerdict | null)[] = [
      {
        is_wearable: true,
        wearable_type: 'garment',
        garment_category: 'outerwear',
        subject_count: 1,
        image_kind: 'flat_lay',
        is_minor_present: false,
        usable_for_tryon: true,
        confidence: 0.95,
        reason: 'test',
      },
    ];

    // A real, tiny, locally-generated PNG — enrichProduct pipes the fetched
    // bytes through `sharp(bytes).metadata()`, so this has to be a genuinely
    // valid image, not arbitrary bytes.
    const fakeImageBytes = await sharp({
      create: { width: 4, height: 4, channels: 3, background: { r: 200, g: 180, b: 160 } },
    })
      .png()
      .toBuffer();

    const ctx = {
      log: childLogger('integration-test'),
      requestId: 'integration-test',
      deadlineMs: Date.now() + 30_000,
      fetch: (async () =>
        new Response(fakeImageBytes, {
          status: 200,
          headers: { 'content-type': 'image/png' },
        })) as typeof fetch,
    };

    const productId = newId('prod');
    const enrichedImages = await enrichProduct(
      normalized,
      store.id,
      productId,
      verdict,
      perImageVisionVerdicts,
      ctx,
    );

    expect(enrichedImages.length).toBeGreaterThan(0);
    expect(enrichedImages[0].url).toContain('fake.ufs.sh');
    expect(enrichedImages[0].isTryonSource).toBe(true);
    expect(enrichedImages[0].role).toBe('flat_lay');

    const saved = await upsertProduct({
      id: productId,
      storeId: store.id,
      normalized,
      garmentCategory: verdict.garmentCategory,
      wearableType: verdict.wearableType,
      eligibility: verdict.eligibility,
      eligibilityReason: verdict.eligibilityReason,
      genderHint: null,
      contentHash: 'test-hash',
    });
    expect(saved?.id).toBe(productId);
    expect(saved?.eligibility).toBe('eligible');

    await replaceProductImages(productId, enrichedImages);
    await replaceProductVariants(
      productId,
      normalized.variants.map((v) => ({
        externalId: v.externalId,
        sku: v.sku,
        optionSize: v.size,
        optionColor: v.color,
        optionOther: v.other,
        priceCents: v.priceCents,
        available: v.available,
      })),
    );

    const roundTrippedProduct = await findProductByExternalId(store.id, 'test-ext-1');
    expect(roundTrippedProduct?.id).toBe(productId);
    expect(roundTrippedProduct?.title).toBe('Test Cardigan');

    const roundTrippedImages = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, productId));
    expect(roundTrippedImages.length).toBe(1);
    expect(roundTrippedImages[0].isTryonSource).toBe(true);

    const roundTrippedVariants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId));
    expect(roundTrippedVariants.length).toBe(1);
    expect(roundTrippedVariants[0].optionSize).toBe('M');
  }, 20_000);
});
