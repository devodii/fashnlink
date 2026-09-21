CREATE TYPE "public"."audit_actor_type" AS ENUM('merchant', 'shopper', 'system', 'admin');--> statement-breakpoint
CREATE TYPE "public"."campaign_item_status" AS ENUM('pending', 'rendered', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."campaign_kind" AS ENUM('abandoned_cart', 'new_drop');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('estimating', 'rendering', 'ready', 'synced', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."cart_event_kind" AS ENUM('tryon_no_buy', 'add_to_cart', 'purchase');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('open', 'claimed');--> statement-breakpoint
CREATE TYPE "public"."eligibility" AS ENUM('eligible', 'not_wearable', 'no_usable_image', 'kids', 'pending');--> statement-breakpoint
CREATE TYPE "public"."esp_provider" AS ENUM('klaviyo', 'mailchimp');--> statement-breakpoint
CREATE TYPE "public"."esp_status" AS ENUM('active', 'invalid');--> statement-breakpoint
CREATE TYPE "public"."garment_category" AS ENUM('top', 'bottom', 'one_piece', 'outerwear', 'shoes', 'accessory', 'set', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."image_role" AS ENUM('flat_lay', 'ghost_mannequin', 'on_model_front', 'on_model_back', 'detail', 'lifestyle', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('email_gate', 'share', 'poll', 'group');--> statement-breakpoint
CREATE TYPE "public"."ledger_reason" AS ENUM('grant_free', 'purchase_founder', 'purchase_plan', 'render', 'refund_failed_render', 'admin', 'campaign_reserve');--> statement-breakpoint
CREATE TYPE "public"."link_kind" AS ENUM('single', 'poll', 'group');--> statement-breakpoint
CREATE TYPE "public"."link_status" AS ENUM('active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'founder', 'starter', 'growth');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('shopify', 'woocommerce', 'squarespace', 'wix', 'bigcommerce', 'magento', 'prestashop', 'salesforce', 'lemonsqueezy', 'gumroad', 'bigcartel', 'generic', 'manual');--> statement-breakpoint
CREATE TYPE "public"."platform_request_status" AS ENUM('open', 'building', 'shipped', 'wontfix');--> statement-breakpoint
CREATE TYPE "public"."render_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."render_via" AS ENUM('direct', 'share', 'poll', 'group', 'claim', 'campaign');--> statement-breakpoint
CREATE TYPE "public"."retarget_source" AS ENUM('email_gate', 'closet', 'link_page');--> statement-breakpoint
CREATE TYPE "public"."twin_status" AS ENUM('pending', 'ready', 'failed', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."wearable_type" AS ENUM('garment', 'footwear', 'headwear', 'eyewear', 'jewelry', 'bag', 'accessory', 'none');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"account_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_type" "audit_actor_type" NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_items" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"shopper_id" text NOT NULL,
	"product_id" text NOT NULL,
	"render_id" text,
	"status" "campaign_item_status" DEFAULT 'pending' NOT NULL,
	"skip_reason" text,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"kind" "campaign_kind" NOT NULL,
	"status" "campaign_status" DEFAULT 'estimating' NOT NULL,
	"product_ids" text[] DEFAULT '{}' NOT NULL,
	"audience_count" integer,
	"estimated_credits" integer,
	"spent_credits" integer DEFAULT 0 NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_events" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"shopper_id" text NOT NULL,
	"product_id" text NOT NULL,
	"variant_id" text,
	"render_id" text,
	"kind" "cart_event_kind" NOT NULL,
	"external_order_id" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"product_id" text NOT NULL,
	"claimed_by_merchant_id" text,
	"render_count" integer DEFAULT 0 NOT NULL,
	"notified_at" timestamp with time zone,
	"status" "claim_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"delta" integer NOT NULL,
	"reason" "ledger_reason" NOT NULL,
	"ref_after" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "esp_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"provider" "esp_provider" NOT NULL,
	"api_key_encrypted" text NOT NULL,
	"list_id" text,
	"status" "esp_status" DEFAULT 'active' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" text PRIMARY KEY NOT NULL,
	"link_id" text NOT NULL,
	"shopper_id" text NOT NULL,
	"render_id" text NOT NULL,
	"chosen_variant_id" text,
	"note" text,
	"show_in_group" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"key" text NOT NULL,
	"actor_id" text NOT NULL,
	"route" text NOT NULL,
	"locked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"response_status" integer,
	"response_body" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_keys_key_actor_id_pk" PRIMARY KEY("key","actor_id")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"run_after" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"shopper_id" text NOT NULL,
	"product_id" text NOT NULL,
	"render_id" text,
	"email" text NOT NULL,
	"source" "lead_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"merchant_id" text NOT NULL,
	"kind" "link_kind" DEFAULT 'single' NOT NULL,
	"title" text,
	"product_ids" text[] DEFAULT '{}' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "link_status" DEFAULT 'active' NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"render_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "links_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"store_domain" text,
	"platform" "platform",
	"stripe_customer_id" text,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"watermark_enabled" boolean DEFAULT true NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchants_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"hostname" text NOT NULL,
	"sample_url" text,
	"detected_platform" "platform",
	"signals" jsonb,
	"request_count" integer DEFAULT 1 NOT NULL,
	"first_merchant_id" text,
	"status" "platform_request_status" DEFAULT 'open' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_requests_hostname_unique" UNIQUE("hostname")
);
--> statement-breakpoint
CREATE TABLE "poll_votes" (
	"id" text PRIMARY KEY NOT NULL,
	"link_id" text NOT NULL,
	"render_id" text NOT NULL,
	"voter_shopper_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"r2_key" text NOT NULL,
	"url" text NOT NULL,
	"source_url" text,
	"width" integer,
	"height" integer,
	"phash" text,
	"alt" text,
	"position" integer DEFAULT 0 NOT NULL,
	"role" "image_role" DEFAULT 'unknown' NOT NULL,
	"is_tryon_source" boolean DEFAULT false NOT NULL,
	"variant_ids" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"external_id" text NOT NULL,
	"sku" text,
	"option_size" text,
	"option_color" text,
	"option_other" text,
	"price_cents" integer,
	"available" boolean DEFAULT true NOT NULL,
	"image_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"external_id" text NOT NULL,
	"handle" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"buy_url" text,
	"brand" text,
	"product_type" text,
	"garment_category" "garment_category" DEFAULT 'unknown' NOT NULL,
	"wearable_type" "wearable_type" DEFAULT 'none' NOT NULL,
	"eligibility" "eligibility" DEFAULT 'pending' NOT NULL,
	"eligibility_reason" text,
	"gender_hint" text,
	"description_text" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"price_cents" integer,
	"currency" text,
	"available" boolean DEFAULT true NOT NULL,
	"size_chart_ref" text,
	"raw" jsonb,
	"external_updated_at" timestamp with time zone,
	"content_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "renders" (
	"id" text PRIMARY KEY NOT NULL,
	"link_id" text,
	"product_id" text NOT NULL,
	"variant_id" text,
	"shopper_id" text NOT NULL,
	"twin_id" text NOT NULL,
	"provider" text,
	"provider_job_id" text,
	"status" "render_status" DEFAULT 'queued' NOT NULL,
	"output_r2_key" text,
	"output_url" text,
	"watermarked" boolean DEFAULT false NOT NULL,
	"cost_cents" integer,
	"latency_ms" integer,
	"error" jsonb,
	"share_count" integer DEFAULT 0 NOT NULL,
	"source_render_id" text,
	"via" "render_via" DEFAULT 'direct' NOT NULL,
	"buy_clicked_at" timestamp with time zone,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retarget_optins" (
	"id" text PRIMARY KEY NOT NULL,
	"shopper_id" text NOT NULL,
	"merchant_id" text NOT NULL,
	"email" text NOT NULL,
	"opted_in_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opted_out_at" timestamp with time zone,
	"source" "retarget_source" NOT NULL,
	"ip" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "shoppers" (
	"id" text PRIMARY KEY NOT NULL,
	"cookie_id" text NOT NULL,
	"email" text,
	"consent_at" timestamp with time zone,
	"age_attested_at" timestamp with time zone,
	"source_render_id" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shoppers_cookie_id_unique" UNIQUE("cookie_id")
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text,
	"domain" text NOT NULL,
	"platform" "platform" NOT NULL,
	"currency" text,
	"country" text,
	"catalog_size" integer,
	"apparel_share" real,
	"fingerprint" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_crawled_at" timestamp with time zone,
	"crawl_cursor" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "twins" (
	"id" text PRIMARY KEY NOT NULL,
	"shopper_id" text NOT NULL,
	"selfie_r2_key" text NOT NULL,
	"selfie_url" text NOT NULL,
	"twin_r2_key" text,
	"twin_url" text,
	"status" "twin_status" DEFAULT 'pending' NOT NULL,
	"provider" text,
	"provider_job_id" text,
	"quality" jsonb,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_items" ADD CONSTRAINT "campaign_items_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_items" ADD CONSTRAINT "campaign_items_shopper_id_shoppers_id_fk" FOREIGN KEY ("shopper_id") REFERENCES "public"."shoppers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_items" ADD CONSTRAINT "campaign_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_items" ADD CONSTRAINT "campaign_items_render_id_renders_id_fk" FOREIGN KEY ("render_id") REFERENCES "public"."renders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_events" ADD CONSTRAINT "cart_events_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_events" ADD CONSTRAINT "cart_events_shopper_id_shoppers_id_fk" FOREIGN KEY ("shopper_id") REFERENCES "public"."shoppers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_events" ADD CONSTRAINT "cart_events_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_events" ADD CONSTRAINT "cart_events_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_events" ADD CONSTRAINT "cart_events_render_id_renders_id_fk" FOREIGN KEY ("render_id") REFERENCES "public"."renders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_claimed_by_merchant_id_merchants_id_fk" FOREIGN KEY ("claimed_by_merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esp_connections" ADD CONSTRAINT "esp_connections_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_shopper_id_shoppers_id_fk" FOREIGN KEY ("shopper_id") REFERENCES "public"."shoppers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_render_id_renders_id_fk" FOREIGN KEY ("render_id") REFERENCES "public"."renders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_chosen_variant_id_product_variants_id_fk" FOREIGN KEY ("chosen_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_shopper_id_shoppers_id_fk" FOREIGN KEY ("shopper_id") REFERENCES "public"."shoppers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_render_id_renders_id_fk" FOREIGN KEY ("render_id") REFERENCES "public"."renders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_requests" ADD CONSTRAINT "platform_requests_first_merchant_id_merchants_id_fk" FOREIGN KEY ("first_merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_render_id_renders_id_fk" FOREIGN KEY ("render_id") REFERENCES "public"."renders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_voter_shopper_id_shoppers_id_fk" FOREIGN KEY ("voter_shopper_id") REFERENCES "public"."shoppers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_image_id_product_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."product_images"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renders" ADD CONSTRAINT "renders_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renders" ADD CONSTRAINT "renders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renders" ADD CONSTRAINT "renders_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renders" ADD CONSTRAINT "renders_shopper_id_shoppers_id_fk" FOREIGN KEY ("shopper_id") REFERENCES "public"."shoppers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renders" ADD CONSTRAINT "renders_twin_id_twins_id_fk" FOREIGN KEY ("twin_id") REFERENCES "public"."twins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renders" ADD CONSTRAINT "renders_source_render_id_renders_id_fk" FOREIGN KEY ("source_render_id") REFERENCES "public"."renders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retarget_optins" ADD CONSTRAINT "retarget_optins_shopper_id_shoppers_id_fk" FOREIGN KEY ("shopper_id") REFERENCES "public"."shoppers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retarget_optins" ADD CONSTRAINT "retarget_optins_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoppers" ADD CONSTRAINT "shoppers_source_render_id_renders_id_fk" FOREIGN KEY ("source_render_id") REFERENCES "public"."renders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "twins" ADD CONSTRAINT "twins_shopper_id_shoppers_id_fk" FOREIGN KEY ("shopper_id") REFERENCES "public"."shoppers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_ledger_merchant_created_idx" ON "credit_ledger" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_merchant_shopper_product_idx" ON "leads" USING btree ("merchant_id","shopper_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "poll_votes_link_voter_idx" ON "poll_votes" USING btree ("link_id","voter_shopper_id");--> statement-breakpoint
CREATE INDEX "product_images_phash_idx" ON "product_images" USING btree ("phash");--> statement-breakpoint
CREATE UNIQUE INDEX "products_store_external_idx" ON "products" USING btree ("store_id","external_id");--> statement-breakpoint
CREATE INDEX "renders_shopper_idx" ON "renders" USING btree ("shopper_id");--> statement-breakpoint
CREATE INDEX "renders_link_status_idx" ON "renders" USING btree ("link_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "retarget_optins_shopper_merchant_idx" ON "retarget_optins" USING btree ("shopper_id","merchant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stores_domain_idx" ON "stores" USING btree ("domain");