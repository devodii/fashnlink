import type { z } from 'zod';
import type { Ctx } from '@/lib/adapter';
import type { Result } from '@/lib/result';
import type { Platform } from '@/db/schema';
import type { NormalizedProduct, RawProduct } from './schema';

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
  platform: Platform;
};

export type Cursor = unknown;

export interface ScraperAdapter {
  readonly key: Platform;
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

// getVariants and collections are intentionally absent: they are
// declarative-only capabilities with no dedicated method to assert against
// (variants ride inside getProduct's RawProduct, collections inside
// listProducts' items).
export const OPTIONAL_CAPABILITY_METHODS: Partial<Record<ScraperCapability, keyof ScraperAdapter>> =
  {
    listProducts: 'listProducts',
    buyDeepLink: 'buyDeepLink',
    freshness: 'freshnessKey',
    contactEmail: 'contactEmail',
  };
