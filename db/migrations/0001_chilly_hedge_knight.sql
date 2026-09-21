CREATE TYPE "public"."discovered_path_status" AS ENUM('new', 'linked', 'ignored');--> statement-breakpoint
ALTER TYPE "public"."platform" ADD VALUE 'custom';--> statement-breakpoint
CREATE TABLE "discovered_paths" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"path" text NOT NULL,
	"link_text" text,
	"score" integer DEFAULT 0 NOT NULL,
	"meta" jsonb,
	"status" "discovered_path_status" DEFAULT 'new' NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "tracking_token" text;--> statement-breakpoint
ALTER TABLE "discovered_paths" ADD CONSTRAINT "discovered_paths_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "discovered_paths_store_path_idx" ON "discovered_paths" USING btree ("store_id","path");--> statement-breakpoint
CREATE INDEX "discovered_paths_store_status_idx" ON "discovered_paths" USING btree ("store_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "stores_tracking_token_idx" ON "stores" USING btree ("tracking_token");