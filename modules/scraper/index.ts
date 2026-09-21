import { createHash } from 'node:crypto';
import type { Ctx } from '@/lib/adapter';
import { err, ok, type Result } from '@/lib/result';
import { redis } from '@/lib/redis';
import { newId } from '@/lib/ids';
import { createStores, updateStores } from '@/actions/stores';
import { createPlatformRequests } from '@/actions/platform-requests';
import { createProducts, retrieveProducts, updateProducts } from '@/actions/products';
import { enqueueJob } from '@/modules/jobs';
import { ScraperRegistry, probeHomepage } from './registry';
import { shopifyAdapter } from './adapters/shopify';
import { woocommerceAdapter } from './adapters/woocommerce';
import { squarespaceAdapter } from './adapters/squarespace';
import { wixAdapter } from './adapters/wix';
import { bigcommerceAdapter } from './adapters/bigcommerce';
import { magentoAdapter } from './adapters/magento';
import { prestashopAdapter } from './adapters/prestashop';
import { salesforceAdapter } from './adapters/salesforce';
import { lemonsqueezyAdapter } from './adapters/lemonsqueezy';
import { gumroadAdapter } from './adapters/gumroad';
import { bigcartelAdapter } from './adapters/bigcartel';
import { genericAdapter } from './adapters/generic';
import { manualAdapter } from './adapters/manual';
import { assessWearability } from './wearable-gate';
import { enrichProduct } from './enrich';
import { WEARABLE_TYPE_CATEGORY } from '@/wearable-rules';
import { buildStoreFingerprint } from './detect';
import type { ScrapeResult } from './schema';
import type { HomepageProbe, ScraperAdapter } from './types';

export const scraperRegistry = new ScraperRegistry([
  shopifyAdapter,
  woocommerceAdapter,
  squarespaceAdapter,
  wixAdapter,
  bigcommerceAdapter,
  magentoAdapter,
  prestashopAdapter,
  salesforceAdapter,
  lemonsqueezyAdapter,
  gumroadAdapter,
  bigcartelAdapter,
  genericAdapter,
  manualAdapter,
]);

function normalizeUrl(input: string): URL {
  const url = new URL(input);
  url.protocol = 'https:';
  const strippedParams = [...url.searchParams.keys()].filter(
    (key) => key.startsWith('utm_') || ['fbclid', 'gclid', 'ref'].includes(key),
  );
  for (const key of strippedParams) url.searchParams.delete(key);
  return url;
}

async function getCachedDetection(domain: string): Promise<string | null> {
  if (!redis) return null;
  return redis.get<string>(`scraper:detect:${domain}`);
}

async function cacheDetection(domain: string, adapterKey: string) {
  if (!redis) return;
  await redis.set(`scraper:detect:${domain}`, adapterKey, { ex: 60 * 60 * 24 });
}

export type ScrapeOneOptions = {
  mode: 'product';
  merchantId?: string | null;
};

export async function scrapeUrl(
  rawUrl: string,
  opts: ScrapeOneOptions,
  ctx: Ctx,
): Promise<Result<ScrapeResult>> {
  const timings: Record<string, number> = {};
  const mark = (label: string, start: number) => {
    timings[label] = Date.now() - start;
  };

  let t = Date.now();
  let url: URL;
  try {
    url = normalizeUrl(rawUrl);
  } catch {
    return err({ code: 'INVALID_INPUT', message: 'Not a valid URL' });
  }
  mark('normalizeUrl', t);

  t = Date.now();
  const cachedAdapterKey = await getCachedDetection(url.hostname);
  const cachedAdapter = cachedAdapterKey ? scraperRegistry.get(cachedAdapterKey) : undefined;

  let adapter: ScraperAdapter;
  let probe: HomepageProbe;
  if (cachedAdapter) {
    adapter = cachedAdapter;
    probe = await probeHomepage(url, ctx);
  } else {
    const result = await scraperRegistry.resolveByUrl(url, ctx);
    if (!result) {
      return err({ code: 'UNSUPPORTED_PLATFORM', message: 'No adapter could handle this URL' });
    }
    adapter = result.adapter;
    probe = result.detect;
    await cacheDetection(url.hostname, result.adapter.key);
  }
  mark('detectPlatform', t);

  t = Date.now();
  const rawResult = await adapter.getProduct(url, ctx);
  mark('fetch', t);
  if (!rawResult.ok) {
    if (adapter.key === 'generic') {
      await createPlatformRequests([
        {
          kind: 'scraped',
          hostname: url.hostname,
          sampleUrl: url.toString(),
          detectedPlatform: null,
          signals: buildStoreFingerprint(probe),
          merchantId: opts.merchantId,
        },
      ]);
    }
    return rawResult;
  }

  t = Date.now();
  const normalizeResult = adapter.normalize(rawResult.value);
  mark('normalize', t);
  if (!normalizeResult.ok) return normalizeResult;
  const product = normalizeResult.value;

  t = Date.now();
  const gateResult = await assessWearability(
    {
      title: product.title,
      productType: product.productType,
      tags: product.tags,
      descriptionText: product.descriptionText.slice(0, 500),
      images: product.images
        .slice(0, 3)
        .map((i) => ({ url: i.url, alt: i.alt, width: i.width, height: i.height })),
    },
    ctx,
  );
  mark('wearableGate', t);
  if (!gateResult.ok) return gateResult;
  const { verdict, perImageVisionVerdicts } = gateResult.value;

  if (verdict.eligibility === 'not_wearable') {
    return err({
      code: 'INVALID_INPUT',
      message:
        "That doesn't look like something a person wears. Paste a clothing, shoe, or accessory product.",
      meta: { eligibility: verdict.eligibility, reason: verdict.eligibilityReason },
    });
  }

  t = Date.now();
  const [store] = await createStores([
    { domain: url.hostname, platform: adapter.key, fingerprint: buildStoreFingerprint(probe) },
  ]);
  if (!store) return err({ code: 'INTERNAL', message: 'Failed to create or find store' });
  mark('store', t);

  const [existingProduct] = await retrieveProducts({
    storeIds: [store.id],
    externalIds: [product.externalId],
  });
  const productId = existingProduct?.id ?? newId('prod');

  t = Date.now();
  const enrichedImages =
    verdict.eligibility === 'kids'
      ? []
      : await enrichProduct(product, store.id, productId, verdict, perImageVisionVerdicts, ctx);
  mark('enrich', t);

  const garmentCategory =
    verdict.garmentCategory !== 'unknown'
      ? verdict.garmentCategory
      : (WEARABLE_TYPE_CATEGORY[verdict.wearableType] ?? 'unknown');

  const contentHash = createHash('sha256')
    .update(
      JSON.stringify({
        title: product.title,
        priceCents: product.priceCents,
        images: product.images.map((i) => i.url),
      }),
    )
    .digest('hex');

  t = Date.now();
  const [savedProduct] = await createProducts([
    {
      id: productId,
      storeId: store.id,
      normalized: product,
      garmentCategory,
      wearableType: verdict.wearableType,
      eligibility: verdict.eligibility,
      eligibilityReason: verdict.eligibilityReason,
      genderHint: null,
      contentHash,
    },
  ]);
  if (!savedProduct) return err({ code: 'INTERNAL', message: 'Failed to persist product' });

  await updateProducts([savedProduct.id], {
    ...(enrichedImages.length ? { images: enrichedImages } : {}),
    variants: product.variants.map((v) => ({
      externalId: v.externalId,
      sku: v.sku,
      optionSize: v.size,
      optionColor: v.color,
      optionOther: v.other,
      priceCents: v.priceCents,
      available: v.available,
    })),
  });
  mark('persist', t);

  await enqueueJob('store.crawled', { storeId: store.id });
  await updateStores([store.id], { lastCrawledAt: new Date() });

  return ok({
    store: {
      domain: store.domain,
      platform: store.platform,
      currency: store.currency,
      country: store.country,
    },
    products: [product],
    adapter: adapter.key,
    timings,
  });
}
