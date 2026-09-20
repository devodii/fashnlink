import sharp from 'sharp';
import type { Ctx } from '@/lib/adapter';
import { putObject } from '@/modules/storage';
import type { NormalizedProduct } from './schema';
import type { FinalWearabilityVerdict, ImageVisionVerdict } from '@/config/wearable-rules';
import type { ImageRole } from '@/db/schema';
import { computeAverageHash, hammingDistanceHex } from './shared/phash';

export type EnrichedImage = {
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
};

const DUPLICATE_HAMMING_THRESHOLD = 4;

// The gate has no front/back distinction for on-model shots, so this
// defaults to front; nothing downstream depends on the split yet.
function imageRoleFromVisionKind(kind: string | undefined): ImageRole {
  switch (kind) {
    case 'flat_lay':
      return 'flat_lay';
    case 'ghost_mannequin':
      return 'ghost_mannequin';
    case 'on_model':
      return 'on_model_front';
    case 'detail':
      return 'detail';
    case 'lifestyle':
      return 'lifestyle';
    default:
      return 'unknown';
  }
}

export async function enrichProduct(
  product: NormalizedProduct,
  storeId: string,
  productId: string,
  gateVerdict: FinalWearabilityVerdict,
  perImageVisionVerdicts: (ImageVisionVerdict | null)[],
  ctx: Ctx,
): Promise<EnrichedImage[]> {
  const seenHashes: string[] = [];
  const enriched: EnrichedImage[] = [];

  for (const [position, image] of product.images.entries()) {
    try {
      const response = await ctx.fetch(image.url);
      if (!response.ok) continue;
      const bytes = Buffer.from(await response.arrayBuffer());

      const hash = await computeAverageHash(bytes);
      const isDuplicate = seenHashes.some(
        (seen) => hammingDistanceHex(seen, hash) <= DUPLICATE_HAMMING_THRESHOLD,
      );
      if (isDuplicate) continue;
      seenHashes.push(hash);

      const metadata = await sharp(bytes).metadata();
      const contentType =
        response.headers.get('content-type') ?? `image/${metadata.format ?? 'jpeg'}`;
      const ext = metadata.format ?? 'jpg';
      const key = `products/${storeId}/${productId}/${hash}.${ext}`;

      const uploaded = await putObject(key, bytes, contentType);

      const visionVerdict = position < 3 ? perImageVisionVerdicts[position] : null;
      const role = imageRoleFromVisionKind(visionVerdict?.image_kind);
      const isTryonSource = gateVerdict.tryonSourceIndex === position;

      enriched.push({
        r2Key: uploaded.key,
        url: uploaded.url,
        sourceUrl: image.url,
        width: image.width ?? metadata.width ?? null,
        height: image.height ?? metadata.height ?? null,
        phash: hash,
        alt: image.alt,
        position,
        role,
        isTryonSource,
        variantIds: image.variantIds,
      });
    } catch (cause) {
      ctx.log.warn({ cause, imageUrl: image.url }, 'skipping image during enrichment');
    }
  }

  // If the gate's chosen try-on source got deduped away, fall back to the
  // first surviving image so a product never ends up with zero try-on images.
  if (
    gateVerdict.tryonSourceIndex !== null &&
    !enriched.some((image) => image.isTryonSource) &&
    enriched.length
  ) {
    enriched[0].isTryonSource = true;
  }

  return enriched;
}
