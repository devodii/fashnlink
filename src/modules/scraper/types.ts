import type { z } from 'zod';
import type { Ctx } from '@/lib/adapter';
import type { Result } from '@/lib/result';
import type { NormalizedProduct, RawProduct } from './schema';

// Matches db/schema.ts `platformEnum` — one source of truth for platform
// identifiers shared by merchants.platform/stores.platform and adapter keys.
export type PlatformKey =
  | 'shopify'
  | 'woocommerce'
  | 'squarespace'
  | 'wix'
  | 'bigcommerce'
  | 'magento'
  | 'prestashop'
  | 'salesforce'
  | 'lemonsqueezy'
  | 'gumroad'
  | 'bigcartel'
  | 'generic'
  | 'manual';

export type ScraperCapability =
  | 'detect'
  | 'getProduct'
  | 'listProducts'
  | 'getVariants'
  | 'buyDeepLink'
  | 'freshness'
  | 'collections'
  | 'contactEmail';

export type HomepageProbe = {
  url: URL;
  status: number;
  headers: Headers;
  html: string;
};

export type DetectResult = {
  match: boolean;
  confidence: number;
  signals: string[];
};

export type StoreRef = {
  domain: string;
  platform: PlatformKey;
};

// Opaque per-adapter pagination cursor (section 6.5) — each adapter decides
// its own shape (a page number, a `next_page_info` token, a sitemap index).
export type Cursor = unknown;

// Section 6.5. Optional methods ARE the capability declaration: `capabilities`
// must list exactly the optional methods actually implemented, and
// `ScraperRegistry`'s boot-time assertion (types below) enforces that.
export interface ScraperAdapter {
  readonly key: PlatformKey;
  readonly displayName: string;
  readonly capabilities: ReadonlySet<ScraperCapability>;
  readonly priority: number;
  readonly hostPatterns?: RegExp[];
  readonly rawSchema: z.ZodType<RawProduct>;

  detect(page: HomepageProbe, ctx: Ctx): Promise<DetectResult>;
  getProduct(url: URL, ctx: Ctx): Promise<Result<RawProduct>>;
  normalize(raw: RawProduct): Result<NormalizedProduct>;

  listProducts?(
    store: StoreRef,
    cursor: Cursor | null,
    ctx: Ctx,
  ): Promise<Result<{ items: RawProduct[]; next: Cursor | null }>>;
  buyDeepLink?(product: NormalizedProduct, variantId?: string): string | null;
  freshnessKey?(raw: RawProduct): string | null;
  contactEmail?(store: StoreRef, ctx: Ctx): Promise<string | null>;
}

// Capabilities backed by a real optional method on ScraperAdapter, checked at
// registry boot (section 6.5: "the registry asserts... each declared
// capability has its method implemented"). `detect`/`getProduct` are required
// methods, always present. `getVariants` and `collections` are declarative
// only — section 6.5 defines no dedicated method for them (variants ride back
// inside getProduct's RawProduct, collection membership inside listProducts'
// items), so there is nothing to assert; callers (e.g. the dashboard) just
// read the flag.
export const OPTIONAL_CAPABILITY_METHODS: Partial<Record<ScraperCapability, keyof ScraperAdapter>> =
  {
    listProducts: 'listProducts',
    buyDeepLink: 'buyDeepLink',
    freshness: 'freshnessKey',
    contactEmail: 'contactEmail',
  };
