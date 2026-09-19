ALTER TABLE "renders" ADD COLUMN "output_url" text;--> statement-breakpoint
ALTER TABLE "twins" ADD COLUMN "selfie_url" text NOT NULL;--> statement-breakpoint
ALTER TABLE "twins" ADD COLUMN "twin_url" text;