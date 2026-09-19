ALTER TABLE "stores" ALTER COLUMN "merchant_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "url" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "stores_domain_idx" ON "stores" USING btree ("domain");