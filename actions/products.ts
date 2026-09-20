import { and, eq, inArray, sql } from 'drizzle-orm';
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

export type CreateProductInput = {
  // Caller-supplied: image storage keys are built from this id before the
  // row exists.
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

export type ProductRow = typeof products.$inferSelect;
export type ProductImageRow = typeof productImages.$inferSelect;

export async function createProduct(input: CreateProductInput) {
  const { normalized } = input;
  const existing = await readProduct({ storeId: input.storeId, externalId: normalized.externalId });

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

export async function readProduct(params: {
  productId: string;
  imagesOnly: true;
}): Promise<ProductImageRow[]>;
export async function readProduct(params: {
  storeId: string;
  externalId: string;
}): Promise<ProductRow | null>;
export async function readProduct(params: {
  merchantId: string;
  ids: string[];
  eligibleOnly: true;
}): Promise<{ id: string; title: string }[]>;
export async function readProduct(params: {
  merchantId: string;
}): Promise<{ product: ProductRow; hasTryonImage: boolean }[]>;
export async function readProduct(params: {
  storeId?: string;
  externalId?: string;
  merchantId?: string;
  ids?: string[];
  eligibleOnly?: boolean;
  productId?: string;
  imagesOnly?: boolean;
}): Promise<unknown> {
  if (params.productId && params.imagesOnly) {
    return db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, params.productId))
      .orderBy(productImages.position);
  }

  if (params.storeId && params.externalId) {
    const [existing] = await db
      .select()
      .from(products)
      .where(and(eq(products.storeId, params.storeId), eq(products.externalId, params.externalId)))
      .limit(1);
    return existing ?? null;
  }

  if (params.merchantId && params.ids && params.eligibleOnly) {
    if (params.ids.length === 0) return [];
    return db
      .select({ id: products.id, title: products.title })
      .from(products)
      .innerJoin(stores, eq(stores.id, products.storeId))
      .where(
        and(
          eq(stores.merchantId, params.merchantId),
          eq(products.eligibility, 'eligible'),
          inArray(products.id, params.ids),
        ),
      );
  }

  if (params.merchantId) {
    return db
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
      .where(eq(stores.merchantId, params.merchantId))
      .orderBy(products.title);
  }

  return null;
}

export async function updateProduct(
  id: string,
  patch: {
    title?: string;
    priceCents?: number | null;
    currency?: string | null;
    available?: boolean;
    externalUpdatedAt?: Date | null;
    contentHash?: string;
    images?: {
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
    }[];
    variants?: {
      externalId: string;
      sku: string | null;
      optionSize: string | null;
      optionColor: string | null;
      optionOther: string | null;
      priceCents: number | null;
      available: boolean;
    }[];
  },
) {
  const { images, variants, ...liveFields } = patch;

  if (Object.keys(liveFields).length > 0) {
    // Live fields only; never touches garment/eligibility classification,
    // which came from a real vision/Jev call this refresh does not re-run.
    await db
      .update(products)
      .set({ ...liveFields, updatedAt: new Date() })
      .where(eq(products.id, id));
  }

  if (images) {
    await db.delete(productImages).where(eq(productImages.productId, id));
    if (images.length > 0) {
      await db
        .insert(productImages)
        .values(images.map((image) => ({ id: newId('img'), productId: id, ...image })));
    }
  }

  if (variants) {
    await db.delete(productVariants).where(eq(productVariants.productId, id));
    if (variants.length > 0) {
      await db
        .insert(productVariants)
        .values(variants.map((variant) => ({ id: newId('variant'), productId: id, ...variant })));
    }
  }
}
