import { and, eq, inArray } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { productImages } from '@/db/schema';
import { retrieveShoppers } from '@/actions/shoppers';
import { retrieveTwins } from '@/actions/twins';
import { retrieveLinks } from '@/actions/links';
import { retrieveProducts } from '@/actions/products';
import { retrieveMerchants } from '@/actions/merchants';
import type { MerchantSettings } from '@/actions/merchants';
import { TryOnFlow } from './try-on-flow';
import { PollFlow } from './poll-flow';
import { GroupFlow } from './group-flow';

export default async function LinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ via?: string; preview?: string }>;
}) {
  const { slug } = await params;
  const { via, preview } = await searchParams;

  const [link] = await retrieveLinks({ slugs: [slug] });
  if (!link || link.status === 'archived') notFound();

  // Independent of each other: the merchant lookup needs `link.merchantId`,
  // the shopper cookie read needs nothing beyond the request itself.
  const [[merchant], { shopperId }] = await Promise.all([
    retrieveMerchants({ ids: [link.merchantId] }),
    retrieveShoppers({ cookieOnly: true }),
  ]);
  const settings = (merchant?.settings ?? {}) as MerchantSettings;

  const [resolvedTwin] = shopperId
    ? await retrieveTwins({ shopperIds: [shopperId], isDefault: true })
    : [];
  const defaultTwin = resolvedTwin
    ? { id: resolvedTwin.id, status: resolvedTwin.status, twinUrl: resolvedTwin.twinUrl }
    : null;

  if (link.kind === 'poll') {
    const pollProducts = await retrieveProducts({ ids: link.productIds });
    const images = pollProducts.length
      ? await db
          .select()
          .from(productImages)
          .where(
            and(
              inArray(
                productImages.productId,
                pollProducts.map((p) => p.id),
              ),
              eq(productImages.isTryonSource, true),
            ),
          )
      : [];
    const imageByProduct = new Map(images.map((i) => [i.productId, i.url]));

    return (
      <PollFlow
        linkId={link.id}
        slug={link.slug}
        merchantName={merchant?.name ?? 'This shop'}
        products={link.productIds
          .map((id) => pollProducts.find((p) => p.id === id))
          .filter((p): p is NonNullable<typeof p> => !!p)
          .map((p) => ({ id: p.id, title: p.title, imageUrl: imageByProduct.get(p.id) ?? null }))}
        defaultTwin={defaultTwin}
        shopperId={shopperId}
      />
    );
  }

  const productId = link.productIds[0];
  if (!productId) notFound();

  const [product] = await retrieveProducts({
    ids: [productId],
    withImages: true,
    withVariants: true,
  });
  if (!product) notFound();

  const productImageRows = product.images ?? [];
  const tryonImage =
    productImageRows.find((image) => image.isTryonSource) ?? productImageRows[0] ?? null;

  const variants = product.variants ?? [];

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

  if (link.kind === 'group') {
    const groupSettings = link.settings as { groupName?: string; groupNote?: string | null };
    return (
      <GroupFlow
        linkId={link.id}
        merchantName={merchant?.name ?? 'This shop'}
        groupName={groupSettings.groupName ?? link.title ?? 'Your group'}
        groupNote={groupSettings.groupNote ?? null}
        productId={product.id}
        productTitle={product.title}
        productImageUrl={tryonImage?.url ?? null}
        variantOptions={variantOptions}
        defaultTwin={defaultTwin}
      />
    );
  }

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
