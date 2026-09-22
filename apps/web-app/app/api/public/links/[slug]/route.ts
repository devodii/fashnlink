import { z } from 'zod';
import { linkDetailResponseSchema } from '@tryonlink/shared';
import { apiHandler } from '@/lib/api-handler';
import { err, ok } from '@/lib/result';
import { retrieveLinks } from '@/actions/links';
import { retrieveProducts } from '@/actions/products';
import { retrieveMerchants, type MerchantSettings } from '@/actions/merchants';
import { retrieveTwins } from '@/actions/twins';

const paramsSchema = z.object({ slug: z.string() });

/**
 * Thin mobile counterpart to app/(shopper)/t/[slug]/page.tsx's data-loading
 * for the single-product flow: same actions, same variant-option shaping,
 * no new business logic. Group and poll links aren't ported to mobile yet
 * (see SPRINT_PLAN / PR notes), so those return INVALID_INPUT here.
 */
export const GET = apiHandler({
  name: 'public.linkDetail',
  auth: ['shopper_session'],
  schema: { params: paramsSchema },
  handler: async ({ params, shopper }) => {
    const [link] = await retrieveLinks({ slugs: [params.slug] });
    if (!link || link.status === 'archived') {
      return err({ code: 'NOT_FOUND', message: 'link not found' });
    }
    if (link.kind !== 'single') {
      return err({
        code: 'INVALID_INPUT',
        message: 'this link type is not supported in the app yet',
      });
    }

    const productId = link.productIds[0];
    if (!productId) return err({ code: 'NOT_FOUND', message: 'link has no product' });

    const [[merchant], [product], [defaultTwin]] = await Promise.all([
      retrieveMerchants({ ids: [link.merchantId] }),
      retrieveProducts({ ids: [productId], withImages: true, withVariants: true }),
      retrieveTwins({ shopperIds: [shopper.shopperId], isDefault: true }),
    ]);
    if (!product) return err({ code: 'NOT_FOUND', message: 'product not found' });

    const settings = (merchant?.settings ?? {}) as MerchantSettings;
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

    return ok(
      linkDetailResponseSchema.parse({
        kind: 'single',
        linkId: link.id,
        productId: product.id,
        productTitle: product.title,
        priceCents: product.priceCents,
        currency: product.currency,
        buyUrl: product.buyUrl,
        merchantName: merchant?.name ?? 'This shop',
        contactChannel: settings.contactChannel ?? null,
        accentToken: settings.accentToken ?? null,
        productImageUrl: tryonImage?.url ?? null,
        variantOptions,
        defaultTwin: defaultTwin
          ? { id: defaultTwin.id, status: defaultTwin.status, twinUrl: defaultTwin.twinUrl }
          : null,
      }),
    );
  },
});
