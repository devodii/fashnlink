import { z } from 'zod';
import { err, ok, type Result } from '@/lib/result';
import type { Ctx } from '@/lib/adapter';
import type { DetectResult, HomepageProbe, ScraperAdapter } from '../types';
import type { NormalizedProduct } from '../schema';

/**
 * Closing note: "manual (not a scraper) the adapter used for
 * uploaded photos so the rest of the system never special-cases it." There is
 * no URL to scrape; the dashboard's manual-upload form (section 8.2, not
 * built until M5) builds this shape directly and calls `normalize()` on it;
 * `getProduct`/`detect` exist only so `manual` satisfies the same interface
 * as every other adapter and the registry never needs a manual-only branch.
 */
export const manualRawSchema = z.object({
  title: z.string().min(1),
  priceCents: z.number().nullable(),
  currency: z.string().nullable(),
  imageUrl: z.string(),
  buyUrl: z.string().nullable(),
  storeId: z.string(),
});

export type ManualRaw = z.infer<typeof manualRawSchema>;

export const manualAdapter: ScraperAdapter = {
  key: 'manual',
  displayName: 'Manual upload',
  priority: 0,
  capabilities: new Set(['detect', 'getProduct']),
  rawSchema: manualRawSchema,

  async detect(_page: HomepageProbe, _ctx: Ctx): Promise<DetectResult> {
    /**
     * Never auto-detected from a homepage probe; a merchant chooses "upload
     * a photo instead" explicitly, the registry never
     * resolves to `manual` via URL/homepage detection.
     */
    return { match: false, confidence: 0, signals: [] };
  },

  async getProduct(_url: URL, _ctx: Ctx): Promise<Result<ManualRaw>> {
    return err({
      code: 'UNSUPPORTED_PLATFORM',
      message: 'manual products are created directly, not scraped from a URL',
    });
  },

  normalize(raw: ManualRaw): Result<NormalizedProduct> {
    const parsed = manualRawSchema.safeParse(raw);
    if (!parsed.success) {
      return err({
        code: 'INVALID_INPUT',
        message: 'Invalid manual product input',
        cause: parsed.error,
      });
    }
    const externalId = `manual_${parsed.data.imageUrl}`;
    return ok({
      externalId,
      handle: externalId,
      title: parsed.data.title,
      url: parsed.data.buyUrl ?? parsed.data.imageUrl,
      buyUrl: parsed.data.buyUrl,
      brand: null,
      productType: null,
      tags: [],
      descriptionText: '',
      priceCents: parsed.data.priceCents,
      currency: parsed.data.currency,
      available: true,
      images: [
        {
          url: parsed.data.imageUrl,
          alt: null,
          width: null,
          height: null,
          position: 0,
          variantIds: [],
        },
      ],
      variants: [],
      options: [],
      externalUpdatedAt: null,
      raw,
    });
  },
};
