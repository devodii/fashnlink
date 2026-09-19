import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { productImages, productVariants, products, stores } from '@/db/schema';
import { newId } from '@/lib/ids';
import type {
  Eligibility,
  GarmentCategory,
  ImageRole,
  WearableType,
} from '@/modules/scraper/types';
import type { NormalizedProduct } from '@/modules/scraper/schema';

export type UpsertProductInput = {
  // Caller-supplied (section 6.6's image storage keys are built from this id
  // *before* the row exists, so the pipeline must know it up front rather
  // than receiving one back from an insert that happens after enrichment).
  id: string;
  storeId: string;
  normalized: NormalizedProduct;
  garmentCategory: GarmentCategory;
  wearableType: WearableType;
  eligibility: Eligibility;
  eligibilityReason: string | null;
  genderHint: string | null;
  contentHash: string;
};

export async function findProductByExternalId(storeId: string, externalId: string) {
  const [existing] = await db
    .select()
    .from(products)
    .where(and(eq(products.storeId, storeId), eq(products.externalId, externalId)))
    .limit(1);
  return existing ?? null;
}

export async function upsertProduct(input: UpsertProductInput) {
  const { normalized } = input;
  const existing = await findProductByExternalId(input.storeId, normalized.externalId);

  const values = {
    storeId: input.storeId,
    externalId: normalized.externalId,
    handle: normalized.handle,
    title: normalized.title,
    url: normalized.url,
    buyUrl: normalized.buyUrl,
    brand: normalized.brand,
    productType: normalized.productType,
    garmentCategory: input.garmentCategory,
    wearableType: input.wearableType,
    eligibility: input.eligibility,
    eligibilityReason: input.eligibilityReason,
    genderHint: input.genderHint,
    descriptionText: normalized.descriptionText,
    tags: normalized.tags,
    priceCents: normalized.priceCents,
    currency: normalized.currency,
    available: normalized.available,
    raw: normalized.raw,
    externalUpdatedAt: normalized.externalUpdatedAt ? new Date(normalized.externalUpdatedAt) : null,
    contentHash: input.contentHash,
    updatedAt: new Date(),
  };

  if (existing) {
    const [updated] = await db
      .update(products)
      .set(values)
      .where(eq(products.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(products)
    .values({ id: input.id, ...values })
    .returning();
  return created;
}

export async function replaceProductImages(
  productId: string,
  images: {
    r2Key: string;
    url: string;
    sourceUrl: string | null;
    width: number | null;
    height: number | null;
    phash: string | null;
    alt: string | null;
    position: number;
    role: ImageRole;
    isTryonSource: boolean;
    variantIds: string[];
  }[],
) {
  await db.delete(productImages).where(eq(productImages.productId, productId));
  if (images.length === 0) return [];
  return db
    .insert(productImages)
    .values(images.map((image) => ({ id: newId('img'), productId, ...image })))
    .returning();
}

export async function replaceProductVariants(
  productId: string,
  variants: {
    externalId: string;
    sku: string | null;
    optionSize: string | null;
    optionColor: string | null;
    optionOther: string | null;
    priceCents: number | null;
    available: boolean;
  }[],
) {
  await db.delete(productVariants).where(eq(productVariants.productId, productId));
  if (variants.length === 0) return [];
  return db
    .insert(productVariants)
    .values(variants.map((variant) => ({ id: newId('variant'), productId, ...variant })))
    .returning();
}

// Section 8.4/6.2's `refresh-catalogs` cron: a lighter update for a product
// that already exists (found again in a catalog re-crawl) — live fields only
// (price, availability, freshness), never touching garment/eligibility
// classification, which came from a real vision/Jev call the refresh isn't
// re-running. `content_hash` still detects when nothing actually changed.
export async function refreshProductLiveFields(
  productId: string,
  patch: {
    title: string;
    priceCents: number | null;
    currency: string | null;
    available: boolean;
    externalUpdatedAt: Date | null;
    contentHash: string;
  },
) {
  await db
    .update(products)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(products.id, productId));
}

// `/dashboard/products` (section 8.2) — every product scraped into any store
// this merchant owns, with a flag for "no usable try-on image" so the page
// can surface it per spec ("shows which products have no usable try-on
// image ... with a hint").
export async function findProductsForMerchant(merchantId: string) {
  const rows = await db
    .select({
      product: products,
      hasTryonImage: sql<boolean>`exists (
        select 1 from ${productImages}
        where ${productImages.productId} = ${products.id}
        and ${productImages.isTryonSource} = true
      )`,
    })
    .from(products)
    .innerJoin(stores, eq(stores.id, products.storeId))
    .where(eq(stores.merchantId, merchantId))
    .orderBy(products.title);
  return rows;
}
