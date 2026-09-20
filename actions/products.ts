import 'server-only';

import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { productImages, productVariants, products, stores } from '@/db/schema';
import type { Product, ProductImage, ProductVariant, ResolvedProduct } from '@/db/schema';
import { newId } from '@/lib/ids';
import type { NormalizedProduct } from '@/modules/scraper/schema';

type CreateProductInput = Pick<
  Product,
  | 'id'
  | 'storeId'
  | 'garmentCategory'
  | 'wearableType'
  | 'eligibility'
  | 'eligibilityReason'
  | 'genderHint'
  | 'contentHash'
> & {
  normalized: NormalizedProduct;
};

export async function createProducts(inputs: CreateProductInput[]): Promise<Product[]> {
  const results = await Promise.all(
    inputs.map(async (input) => {
      const { normalized } = input;
      const [existing] = await retrieveProducts({
        storeIds: [input.storeId],
        externalIds: [normalized.externalId],
      });

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
        externalUpdatedAt: normalized.externalUpdatedAt
          ? new Date(normalized.externalUpdatedAt)
          : null,
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
    }),
  );
  return results.filter((r): r is Product => Boolean(r));
}

export async function retrieveProducts(filters: {
  ids?: string[];
  storeIds?: string[];
  externalIds?: string[];
  merchantId?: string;
  eligibleOnly?: boolean;
  withImages?: boolean;
}): Promise<ResolvedProduct[]> {
  const conditions = [
    filters.ids?.length ? inArray(products.id, filters.ids) : undefined,
    filters.storeIds?.length ? inArray(products.storeId, filters.storeIds) : undefined,
    filters.externalIds?.length ? inArray(products.externalId, filters.externalIds) : undefined,
    filters.eligibleOnly ? eq(products.eligibility, 'eligible') : undefined,
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));

  let rows: { product: Product; hasTryonImage?: boolean }[];

  if (filters.merchantId) {
    rows = await db
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
      .where(and(eq(stores.merchantId, filters.merchantId), ...conditions))
      .orderBy(products.title);
  } else {
    if (conditions.length === 0) return [];
    rows = (
      await db
        .select()
        .from(products)
        .where(and(...conditions))
    ).map((product) => ({
      product,
    }));
  }

  return Promise.all(
    rows.map(async ({ product, hasTryonImage }) => {
      const resolved: ResolvedProduct = { ...product };
      if (hasTryonImage !== undefined) resolved.hasTryonImage = hasTryonImage;
      if (filters.withImages) {
        resolved.images = await db
          .select()
          .from(productImages)
          .where(eq(productImages.productId, product.id))
          .orderBy(productImages.position);
      }
      return resolved;
    }),
  );
}

type UpdateProductPatch = Partial<
  Pick<
    Product,
    'title' | 'priceCents' | 'currency' | 'available' | 'externalUpdatedAt' | 'contentHash'
  >
> & {
  images?: Partial<
    Pick<
      ProductImage,
      | 'r2Key'
      | 'url'
      | 'sourceUrl'
      | 'width'
      | 'height'
      | 'phash'
      | 'alt'
      | 'position'
      | 'role'
      | 'isTryonSource'
      | 'variantIds'
    >
  >[];
  variants?: Partial<
    Pick<
      ProductVariant,
      | 'externalId'
      | 'sku'
      | 'optionSize'
      | 'optionColor'
      | 'optionOther'
      | 'priceCents'
      | 'available'
    >
  >[];
};

export async function updateProducts(ids: string[], patch: UpdateProductPatch): Promise<Product[]> {
  if (ids.length === 0) return [];
  const { images, variants, ...liveFields } = patch;

  let updated: Product[] = [];
  if (Object.keys(liveFields).length > 0) {
    updated = await db
      .update(products)
      .set({ ...liveFields, updatedAt: new Date() })
      .where(inArray(products.id, ids))
      .returning();
  }

  if (images) {
    await db.delete(productImages).where(inArray(productImages.productId, ids));
    if (images.length > 0) {
      await db
        .insert(productImages)
        .values(
          ids.flatMap((id) =>
            images.map((image) => ({ id: newId('img'), productId: id, ...image })),
          ) as (typeof productImages.$inferInsert)[],
        );
    }
  }

  if (variants) {
    await db.delete(productVariants).where(inArray(productVariants.productId, ids));
    if (variants.length > 0) {
      await db
        .insert(productVariants)
        .values(
          ids.flatMap((id) =>
            variants.map((variant) => ({ id: newId('variant'), productId: id, ...variant })),
          ) as (typeof productVariants.$inferInsert)[],
        );
    }
  }

  if (updated.length === 0 && (images !== undefined || variants !== undefined)) {
    updated = await db.select().from(products).where(inArray(products.id, ids));
  }

  return updated;
}
