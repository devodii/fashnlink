import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { InferSelectModel } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

// ---------- Enums ----------

/**
 * Shared by merchants.platform, stores.platform, and the ScraperAdapter `key`,
 * the one source of truth for platform identifiers.
 */
export const platformEnum = pgEnum('platform', [
  'shopify',
  'woocommerce',
  'squarespace',
  'wix',
  'bigcommerce',
  'magento',
  'prestashop',
  'salesforce',
  'lemonsqueezy',
  'gumroad',
  'bigcartel',
  'ebay',
  'jumia',
  'generic',
  'manual',
]);

export const planEnum = pgEnum('plan', ['free', 'founder', 'starter', 'growth']);

export const garmentCategoryEnum = pgEnum('garment_category', [
  'top',
  'bottom',
  'one_piece',
  'outerwear',
  'shoes',
  'accessory',
  'set',
  'unknown',
]);

export const wearableTypeEnum = pgEnum('wearable_type', [
  'garment',
  'footwear',
  'headwear',
  'eyewear',
  'jewelry',
  'bag',
  'accessory',
  'none',
]);

export const eligibilityEnum = pgEnum('eligibility', [
  'eligible',
  'not_wearable',
  'no_usable_image',
  'kids',
  'pending',
]);

export const imageRoleEnum = pgEnum('image_role', [
  'flat_lay',
  'ghost_mannequin',
  'on_model_front',
  'on_model_back',
  'detail',
  'lifestyle',
  'unknown',
]);

export const linkKindEnum = pgEnum('link_kind', ['single', 'poll', 'group']);
export const linkStatusEnum = pgEnum('link_status', ['active', 'paused', 'archived']);

export const twinStatusEnum = pgEnum('twin_status', ['pending', 'ready', 'failed', 'deleted']);

export const renderStatusEnum = pgEnum('render_status', [
  'queued',
  'running',
  'succeeded',
  'failed',
  'blocked',
]);

export const renderViaEnum = pgEnum('render_via', [
  'direct',
  'share',
  'poll',
  'group',
  'claim',
  'campaign',
]);

export const leadSourceEnum = pgEnum('lead_source', ['email_gate', 'share', 'poll', 'group']);

export const ledgerReasonEnum = pgEnum('ledger_reason', [
  'grant_free',
  'purchase_founder',
  'purchase_plan',
  'render',
  'refund_failed_render',
  'admin',
  'campaign_reserve',
]);

export const jobStatusEnum = pgEnum('job_status', ['queued', 'running', 'succeeded', 'failed']);

export const claimStatusEnum = pgEnum('claim_status', ['open', 'claimed']);

export const retargetSourceEnum = pgEnum('retarget_source', ['email_gate', 'closet', 'link_page']);

export const espProviderEnum = pgEnum('esp_provider', ['klaviyo', 'mailchimp']);
export const espStatusEnum = pgEnum('esp_status', ['active', 'invalid']);

export const campaignKindEnum = pgEnum('campaign_kind', ['abandoned_cart', 'new_drop']);
export const campaignStatusEnum = pgEnum('campaign_status', [
  'estimating',
  'rendering',
  'ready',
  'synced',
  'cancelled',
]);
export const campaignItemStatusEnum = pgEnum('campaign_item_status', [
  'pending',
  'rendered',
  'failed',
  'skipped',
]);

export const cartEventKindEnum = pgEnum('cart_event_kind', [
  'tryon_no_buy',
  'add_to_cart',
  'purchase',
]);

export const platformRequestStatusEnum = pgEnum('platform_request_status', [
  'open',
  'building',
  'shipped',
  'wontfix',
]);

export const auditActorTypeEnum = pgEnum('audit_actor_type', [
  'merchant',
  'shopper',
  'system',
  'admin',
]);

// ---------- Tables ----------

export const merchants = pgTable('merchants', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  storeDomain: text('store_domain'),
  platform: platformEnum('platform'),
  stripeCustomerId: text('stripe_customer_id'),
  plan: planEnum('plan').notNull().default('free'),
  watermarkEnabled: boolean('watermark_enabled').notNull().default(true),
  settings: jsonb('settings').notNull().default({}),
  ...timestamps,
});

export const stores = pgTable(
  'stores',
  {
    id: text('id').primaryKey(),
    // Nullable: a store can exist and accrue renders before any merchant
    // claims it (reverse acquisition, the marketing quick-link demo).
    merchantId: text('merchant_id').references(() => merchants.id),
    domain: text('domain').notNull(),
    platform: platformEnum('platform').notNull(),
    currency: text('currency'),
    country: text('country'),
    catalogSize: integer('catalog_size'),
    apparelShare: real('apparel_share'),
    fingerprint: jsonb('fingerprint').notNull().default({}),
    lastCrawledAt: timestamp('last_crawled_at', { withTimezone: true }),
    crawlCursor: jsonb('crawl_cursor'),
    ...timestamps,
  },
  (table) => [uniqueIndex('stores_domain_idx').on(table.domain)],
);

export const products = pgTable(
  'products',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id),
    externalId: text('external_id').notNull(),
    handle: text('handle').notNull(),
    title: text('title').notNull(),
    url: text('url').notNull(),
    buyUrl: text('buy_url'),
    brand: text('brand'),
    productType: text('product_type'),
    garmentCategory: garmentCategoryEnum('garment_category').notNull().default('unknown'),
    wearableType: wearableTypeEnum('wearable_type').notNull().default('none'),
    eligibility: eligibilityEnum('eligibility').notNull().default('pending'),
    eligibilityReason: text('eligibility_reason'),
    genderHint: text('gender_hint'),
    descriptionText: text('description_text'),
    tags: text('tags').array().notNull().default([]),
    priceCents: integer('price_cents'),
    currency: text('currency'),
    available: boolean('available').notNull().default(true),
    sizeChartRef: text('size_chart_ref'),
    raw: jsonb('raw'),
    externalUpdatedAt: timestamp('external_updated_at', { withTimezone: true }),
    contentHash: text('content_hash'),
    ...timestamps,
  },
  (table) => [uniqueIndex('products_store_external_idx').on(table.storeId, table.externalId)],
);

export const productImages = pgTable(
  'product_images',
  {
    id: text('id').primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    /**
     * Despite its name, `r2Key` holds an UploadThing customId, not an R2
     * object key (storage moved to UploadThing; renaming the column would
     * need a migration). `url` is required alongside it because UploadThing
     * cannot re-derive a public URL from the key later, unlike R2's
     * public-bucket scheme; the URL returned at upload time must be
     * persisted directly.
     */
    r2Key: text('r2_key').notNull(),
    url: text('url').notNull(),
    sourceUrl: text('source_url'),
    width: integer('width'),
    height: integer('height'),
    phash: text('phash'),
    alt: text('alt'),
    position: integer('position').notNull().default(0),
    role: imageRoleEnum('role').notNull().default('unknown'),
    isTryonSource: boolean('is_tryon_source').notNull().default(false),
    variantIds: text('variant_ids').array().notNull().default([]),
    ...timestamps,
  },
  (table) => [index('product_images_phash_idx').on(table.phash)],
);

export const productVariants = pgTable('product_variants', {
  id: text('id').primaryKey(),
  productId: text('product_id')
    .notNull()
    .references(() => products.id),
  externalId: text('external_id').notNull(),
  sku: text('sku'),
  optionSize: text('option_size'),
  optionColor: text('option_color'),
  optionOther: text('option_other'),
  priceCents: integer('price_cents'),
  available: boolean('available').notNull().default(true),
  imageId: text('image_id').references((): AnyPgColumn => productImages.id),
  ...timestamps,
});

export const links = pgTable('links', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  // Stays notNull, unlike stores.merchantId: the marketing quick-demo owns
  // its link through a seeded system merchant (src/config/system-merchant.ts)
  // rather than needing a parallel null-merchant code path everywhere else.
  merchantId: text('merchant_id')
    .notNull()
    .references(() => merchants.id),
  kind: linkKindEnum('kind').notNull().default('single'),
  title: text('title'),
  productIds: text('product_ids').array().notNull().default([]),
  settings: jsonb('settings').notNull().default({}),
  status: linkStatusEnum('status').notNull().default('active'),
  viewCount: integer('view_count').notNull().default(0),
  renderCount: integer('render_count').notNull().default(0),
  ...timestamps,
});

export const shoppers = pgTable('shoppers', {
  id: text('id').primaryKey(),
  cookieId: text('cookie_id').notNull().unique(),
  email: text('email'),
  consentAt: timestamp('consent_at', { withTimezone: true }),
  ageAttestedAt: timestamp('age_attested_at', { withTimezone: true }),
  // Forward reference to a table defined later in this file; the lazy
  // accessor defers resolution until drizzle builds the schema.
  sourceRenderId: text('source_render_id').references((): AnyPgColumn => renders.id),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  ...timestamps,
});

export const twins = pgTable('twins', {
  id: text('id').primaryKey(),
  shopperId: text('shopper_id')
    .notNull()
    .references(() => shoppers.id),
  // Same UploadThing customId-in-an-R2-named-column pattern as
  // product_images. twinUrl is nullable: the twin doesn't exist until
  // generation finishes.
  selfieR2Key: text('selfie_r2_key').notNull(),
  selfieUrl: text('selfie_url').notNull(),
  twinR2Key: text('twin_r2_key'),
  twinUrl: text('twin_url'),
  status: twinStatusEnum('status').notNull().default('pending'),
  provider: text('provider'),
  providerJobId: text('provider_job_id'),
  quality: jsonb('quality'),
  isDefault: boolean('is_default').notNull().default(false),
  ...timestamps,
});

export const renders = pgTable(
  'renders',
  {
    id: text('id').primaryKey(),
    // Nullable: a campaign-driven render (via: 'campaign') has no
    // shopper-facing link, since it is pushed straight to the shopper's
    // inbox via the merchant's ESP. Every other via value always has one.
    linkId: text('link_id').references(() => links.id),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    variantId: text('variant_id').references(() => productVariants.id),
    shopperId: text('shopper_id')
      .notNull()
      .references(() => shoppers.id),
    twinId: text('twin_id')
      .notNull()
      .references(() => twins.id),
    provider: text('provider'),
    providerJobId: text('provider_job_id'),
    status: renderStatusEnum('status').notNull().default('queued'),
    // Same UploadThing pattern as product_images/twins; nullable, the
    // output doesn't exist until the fal webhook lands.
    outputR2Key: text('output_r2_key'),
    outputUrl: text('output_url'),
    watermarked: boolean('watermarked').notNull().default(false),
    costCents: integer('cost_cents'),
    latencyMs: integer('latency_ms'),
    error: jsonb('error'),
    shareCount: integer('share_count').notNull().default(0),
    sourceRenderId: text('source_render_id').references((): AnyPgColumn => renders.id),
    via: renderViaEnum('via').notNull().default('direct'),
    buyClickedAt: timestamp('buy_clicked_at', { withTimezone: true }),
    isPublic: boolean('is_public').notNull().default(true),
    ...timestamps,
  },
  (table) => [
    index('renders_shopper_idx').on(table.shopperId),
    index('renders_link_status_idx').on(table.linkId, table.status),
  ],
);

export const pollVotes = pgTable(
  'poll_votes',
  {
    id: text('id').primaryKey(),
    linkId: text('link_id')
      .notNull()
      .references(() => links.id),
    renderId: text('render_id')
      .notNull()
      .references(() => renders.id),
    voterShopperId: text('voter_shopper_id')
      .notNull()
      .references(() => shoppers.id),
    createdAt: timestamps.createdAt,
  },
  (table) => [uniqueIndex('poll_votes_link_voter_idx').on(table.linkId, table.voterShopperId)],
);

export const groupMembers = pgTable('group_members', {
  id: text('id').primaryKey(),
  linkId: text('link_id')
    .notNull()
    .references(() => links.id),
  shopperId: text('shopper_id')
    .notNull()
    .references(() => shoppers.id),
  renderId: text('render_id')
    .notNull()
    .references(() => renders.id),
  chosenVariantId: text('chosen_variant_id').references(() => productVariants.id),
  note: text('note'),
  showInGroup: boolean('show_in_group').notNull().default(false),
  ...timestamps,
});

export const leads = pgTable(
  'leads',
  {
    id: text('id').primaryKey(),
    merchantId: text('merchant_id')
      .notNull()
      .references(() => merchants.id),
    shopperId: text('shopper_id')
      .notNull()
      .references(() => shoppers.id),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    renderId: text('render_id').references(() => renders.id),
    email: text('email').notNull(),
    source: leadSourceEnum('source').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('leads_merchant_shopper_product_idx').on(
      table.merchantId,
      table.shopperId,
      table.productId,
    ),
  ],
);

export const creditLedger = pgTable(
  'credit_ledger',
  {
    id: text('id').primaryKey(),
    merchantId: text('merchant_id')
      .notNull()
      .references(() => merchants.id),
    delta: integer('delta').notNull(),
    reason: ledgerReasonEnum('reason').notNull(),
    // The running balance snapshot immediately after this entry.
    refAfter: integer('ref_after').notNull(),
    createdAt: timestamps.createdAt,
  },
  (table) => [index('credit_ledger_merchant_created_idx').on(table.merchantId, table.createdAt)],
);

export const paymentEvents = pgTable('payment_events', {
  // Primary key is the provider's own event id, not a generated ulid.
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),
  type: text('type').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  payload: jsonb('payload').notNull(),
});

export const jobs = pgTable('jobs', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull().default({}),
  status: jobStatusEnum('status').notNull().default('queued'),
  attempts: integer('attempts').notNull().default(0),
  runAfter: timestamp('run_after', { withTimezone: true }).notNull().defaultNow(),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  lastError: text('last_error'),
  ...timestamps,
});

export const claims = pgTable('claims', {
  id: text('id').primaryKey(),
  storeId: text('store_id')
    .notNull()
    .references(() => stores.id),
  productId: text('product_id')
    .notNull()
    .references(() => products.id),
  claimedByMerchantId: text('claimed_by_merchant_id').references(() => merchants.id),
  renderCount: integer('render_count').notNull().default(0),
  notifiedAt: timestamp('notified_at', { withTimezone: true }),
  status: claimStatusEnum('status').notNull().default('open'),
  ...timestamps,
});

export const auditLog = pgTable('audit_log', {
  id: text('id').primaryKey(),
  actorType: auditActorTypeEnum('actor_type').notNull(),
  actorId: text('actor_id'),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: text('target_id'),
  meta: jsonb('meta'),
  createdAt: timestamps.createdAt,
});

export const retargetOptins = pgTable(
  'retarget_optins',
  {
    id: text('id').primaryKey(),
    shopperId: text('shopper_id')
      .notNull()
      .references(() => shoppers.id),
    merchantId: text('merchant_id')
      .notNull()
      .references(() => merchants.id),
    email: text('email').notNull(),
    optedInAt: timestamp('opted_in_at', { withTimezone: true }).notNull().defaultNow(),
    optedOutAt: timestamp('opted_out_at', { withTimezone: true }),
    source: retargetSourceEnum('source').notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
  },
  (table) => [
    uniqueIndex('retarget_optins_shopper_merchant_idx').on(table.shopperId, table.merchantId),
  ],
);

export const espConnections = pgTable('esp_connections', {
  id: text('id').primaryKey(),
  merchantId: text('merchant_id')
    .notNull()
    .references(() => merchants.id),
  provider: espProviderEnum('provider').notNull(),
  apiKeyEncrypted: text('api_key_encrypted').notNull(),
  listId: text('list_id'),
  status: espStatusEnum('status').notNull().default('active'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  settings: jsonb('settings').notNull().default({}),
  ...timestamps,
});

export const campaigns = pgTable('campaigns', {
  id: text('id').primaryKey(),
  merchantId: text('merchant_id')
    .notNull()
    .references(() => merchants.id),
  kind: campaignKindEnum('kind').notNull(),
  status: campaignStatusEnum('status').notNull().default('estimating'),
  productIds: text('product_ids').array().notNull().default([]),
  audienceCount: integer('audience_count'),
  estimatedCredits: integer('estimated_credits'),
  spentCredits: integer('spent_credits').notNull().default(0),
  settings: jsonb('settings').notNull().default({}),
  syncedAt: timestamp('synced_at', { withTimezone: true }),
  ...timestamps,
});

export const campaignItems = pgTable('campaign_items', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id')
    .notNull()
    .references(() => campaigns.id),
  shopperId: text('shopper_id')
    .notNull()
    .references(() => shoppers.id),
  productId: text('product_id')
    .notNull()
    .references(() => products.id),
  renderId: text('render_id').references(() => renders.id),
  status: campaignItemStatusEnum('status').notNull().default('pending'),
  skipReason: text('skip_reason'),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  ...timestamps,
});

export const cartEvents = pgTable('cart_events', {
  id: text('id').primaryKey(),
  merchantId: text('merchant_id')
    .notNull()
    .references(() => merchants.id),
  shopperId: text('shopper_id')
    .notNull()
    .references(() => shoppers.id),
  productId: text('product_id')
    .notNull()
    .references(() => products.id),
  variantId: text('variant_id').references(() => productVariants.id),
  renderId: text('render_id').references(() => renders.id),
  kind: cartEventKindEnum('kind').notNull(),
  externalOrderId: text('external_order_id'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
});

export const platformRequests = pgTable('platform_requests', {
  id: text('id').primaryKey(),
  hostname: text('hostname').notNull().unique(),
  sampleUrl: text('sample_url'),
  detectedPlatform: platformEnum('detected_platform'),
  signals: jsonb('signals'),
  requestCount: integer('request_count').notNull().default(1),
  firstMerchantId: text('first_merchant_id').references(() => merchants.id),
  status: platformRequestStatusEnum('status').notNull().default('open'),
  notes: text('notes'),
  ...timestamps,
});

// Primary key is the (key, actorId) pair itself, not a generated ulid,
// since that pair is the identity being deduplicated.
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    key: text('key').notNull(),
    actorId: text('actor_id').notNull(),
    route: text('route').notNull(),
    lockedAt: timestamp('locked_at', { withTimezone: true }).notNull().defaultNow(),
    responseStatus: integer('response_status'),
    responseBody: jsonb('response_body'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.key, table.actorId] })],
);

// ---------- Auth (better-auth's own tables) ----------

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  name: text('name').notNull(),
  image: text('image'),
  ...timestamps,
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  ...timestamps,
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  providerId: text('provider_id').notNull(),
  accountId: text('account_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  ...timestamps,
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ...timestamps,
});

// ---------- Types ----------

export type Merchant = InferSelectModel<typeof merchants>;
export type Store = InferSelectModel<typeof stores>;
export type Product = InferSelectModel<typeof products>;
export type ProductImage = InferSelectModel<typeof productImages>;
export type ProductVariant = InferSelectModel<typeof productVariants>;
export type Link = InferSelectModel<typeof links>;
export type Shopper = InferSelectModel<typeof shoppers>;
export type Twin = InferSelectModel<typeof twins>;
export type Render = InferSelectModel<typeof renders>;
export type PollVote = InferSelectModel<typeof pollVotes>;
export type GroupMember = InferSelectModel<typeof groupMembers>;
export type Lead = InferSelectModel<typeof leads>;
export type CreditLedger = InferSelectModel<typeof creditLedger>;
export type PaymentEvent = InferSelectModel<typeof paymentEvents>;
export type Job = InferSelectModel<typeof jobs>;
export type Claim = InferSelectModel<typeof claims>;
export type AuditLog = InferSelectModel<typeof auditLog>;
export type RetargetOptin = InferSelectModel<typeof retargetOptins>;
export type EspConnection = InferSelectModel<typeof espConnections>;
export type Campaign = InferSelectModel<typeof campaigns>;
export type CampaignItem = InferSelectModel<typeof campaignItems>;
export type CartEvent = InferSelectModel<typeof cartEvents>;
export type PlatformRequest = InferSelectModel<typeof platformRequests>;
export type IdempotencyKey = InferSelectModel<typeof idempotencyKeys>;
export type User = InferSelectModel<typeof user>;
export type Session = InferSelectModel<typeof session>;
export type Account = InferSelectModel<typeof account>;
export type Verification = InferSelectModel<typeof verification>;

export type Platform = (typeof platformEnum.enumValues)[number];
export type Plan = (typeof planEnum.enumValues)[number];
export type GarmentCategory = (typeof garmentCategoryEnum.enumValues)[number];
export type WearableType = (typeof wearableTypeEnum.enumValues)[number];
export type Eligibility = (typeof eligibilityEnum.enumValues)[number];
export type ImageRole = (typeof imageRoleEnum.enumValues)[number];
export type LinkKind = (typeof linkKindEnum.enumValues)[number];
export type LinkStatus = (typeof linkStatusEnum.enumValues)[number];
export type TwinStatus = (typeof twinStatusEnum.enumValues)[number];
export type RenderStatus = (typeof renderStatusEnum.enumValues)[number];
export type RenderVia = (typeof renderViaEnum.enumValues)[number];
export type LeadSource = (typeof leadSourceEnum.enumValues)[number];
export type LedgerReason = (typeof ledgerReasonEnum.enumValues)[number];
export type JobStatus = (typeof jobStatusEnum.enumValues)[number];
export type ClaimStatus = (typeof claimStatusEnum.enumValues)[number];
export type RetargetSource = (typeof retargetSourceEnum.enumValues)[number];
export type EspProvider = (typeof espProviderEnum.enumValues)[number];
export type EspStatus = (typeof espStatusEnum.enumValues)[number];
export type CampaignKind = (typeof campaignKindEnum.enumValues)[number];
export type CampaignStatus = (typeof campaignStatusEnum.enumValues)[number];
export type CampaignItemStatus = (typeof campaignItemStatusEnum.enumValues)[number];
export type CartEventKind = (typeof cartEventKindEnum.enumValues)[number];
export type PlatformRequestStatus = (typeof platformRequestStatusEnum.enumValues)[number];
export type AuditActorType = (typeof auditActorTypeEnum.enumValues)[number];

// ---------- Resolved (joined/derived) types ----------
// Every optional field is populated only when the retrieving action's
// filters asked for it; callers check for presence rather than the action
// having multiple overloaded return shapes.

export type ResolvedLink = Link & {
  product?: { title: string | null } | null;
  isClosed?: boolean | null;
};
export type ResolvedProduct = Product & {
  images?: ProductImage[] | null;
  variants?: ProductVariant[] | null;
  hasTryonImage?: boolean | null;
};
export type ResolvedStore = Store;
export type ResolvedCampaign = Campaign & {
  itemCounts?: { pending: number; rendered: number; failed: number; skipped: number } | null;
};
export type ResolvedClaim = Claim & { productTitle?: string | null };
export type ResolvedLead = Lead & { productTitle?: string | null; count?: number | null };
export type ResolvedMerchant = Merchant;
export type ResolvedTwin = Twin;
export type ResolvedShopper = Shopper & { twinId?: string | null; twinUrl?: string | null };
export type ResolvedGroupMember = GroupMember & { twinUrl?: string | null };
export type ResolvedRetargetOptin = RetargetOptin & { merchantName?: string | null };
