import { and, desc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { links, merchants, productImages, productVariants, products, twins } from '@/db/schema';
import { readShopperId } from '@/modules/shoppers';
import type { MerchantSettings } from '@/db/repos/merchants';
import { TryOnFlow } from './try-on-flow';

// Section 8.3: `/t/[slug]` — single-link mode (poll/group are M6). Server
// Component: data loading + composition only, per section 2's "app/ routes
// only, thin" rule — the interactive flow is the colocated client island.
export default async function LinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ via?: string; preview?: string }>;
}) {
  const { slug } = await params;
  const { via, preview } = await searchParams;

  const [link] = await db.select().from(links).where(eq(links.slug, slug)).limit(1);
  if (!link || link.status === 'archived') notFound();

  const productId = link.productIds[0];
  if (!productId) notFound();

  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) notFound();

  const [merchant] = await db
    .select({ name: merchants.name, settings: merchants.settings })
    .from(merchants)
    .where(eq(merchants.id, link.merchantId))
    .limit(1);

  const images = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, product.id))
    .orderBy(productImages.position);
  const tryonImage = images.find((image) => image.isTryonSource) ?? images[0] ?? null;

  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, product.id));

  // DECISION: grouping distinct size/color values across flat
  // option_size/option_color columns (section 5's product_variants shape)
  // into VariantPicker's { name, values } options — option_other isn't
  // surfaced yet, only Size/Color, since that's what VariantPicker's own
  // section 10.4 spec calls out by name and nothing downstream needs a third
  // axis yet.
  const sizeValues = new Map<string, boolean>();
  const colorValues = new Map<string, boolean>();
  for (const variant of variants) {
    if (variant.optionSize) {
      sizeValues.set(
        variant.optionSize,
        (sizeValues.get(variant.optionSize) ?? false) || variant.available,
      );
    }
    if (variant.optionColor) {
      colorValues.set(
        variant.optionColor,
        (colorValues.get(variant.optionColor) ?? false) || variant.available,
      );
    }
  }
  const variantOptions = [
    sizeValues.size > 0
      ? {
          name: 'Size',
          values: Array.from(sizeValues.entries()).map(([id, available]) => ({
            id,
            label: id,
            available,
          })),
        }
      : null,
    colorValues.size > 0
      ? {
          name: 'Color',
          values: Array.from(colorValues.entries()).map(([id, available]) => ({
            id,
            label: id,
            available,
          })),
        }
      : null,
  ].filter((option): option is NonNullable<typeof option> => option !== null);

  const shopperId = await readShopperId();
  const defaultTwin = shopperId
    ? await db
        .select({ id: twins.id, status: twins.status, twinUrl: twins.twinUrl })
        .from(twins)
        .where(and(eq(twins.shopperId, shopperId), eq(twins.isDefault, true)))
        .orderBy(desc(twins.createdAt))
        .limit(1)
        .then((rows) => rows[0] ?? null)
    : null;

  // M5 now writes this (onboarding step 2 / `/dashboard/settings`, via
  // `PATCH /api/merchants/me`) — `MerchantSettings` (src/db/repos/merchants.ts)
  // is the one shape both readers and writers share.
  const settings = (merchant?.settings ?? {}) as MerchantSettings;

  return (
    <TryOnFlow
      linkId={link.id}
      productId={product.id}
      productTitle={product.title}
      priceCents={product.priceCents}
      currency={product.currency}
      buyUrl={product.buyUrl}
      merchantName={merchant?.name ?? 'This shop'}
      contactChannel={settings.contactChannel ?? null}
      accentToken={settings.accentToken ?? null}
      productImageUrl={tryonImage?.url ?? null}
      variantOptions={variantOptions}
      defaultTwin={defaultTwin}
      viaRenderId={via ?? null}
      preview={preview === '1'}
    />
  );
}
