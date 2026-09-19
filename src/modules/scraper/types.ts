import type { z } from 'zod';
import type { Ctx } from '@/lib/adapter';
import type { Result } from '@/lib/result';
import type {
  eligibilityEnum,
  garmentCategoryEnum,
  imageRoleEnum,
  platformEnum,
  wearableTypeEnum,
} from '@/db/schema';
import type { NormalizedProduct, RawProduct } from './schema';

// Derived from platformEnum in db/schema.ts, not hand-listed, so adding a
// platform only ever means editing the enum.
export type PlatformKey = (typeof platformEnum.enumValues)[number];

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

export type Cursor = unknown;

// Same derive-from-schema pattern as PlatformKey above.
export type GarmentCategory = (typeof garmentCategoryEnum.enumValues)[number];
export type WearableType = (typeof wearableTypeEnum.enumValues)[number];
export type Eligibility = (typeof eligibilityEnum.enumValues)[number];
export type ImageRole = (typeof imageRoleEnum.enumValues)[number];

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
