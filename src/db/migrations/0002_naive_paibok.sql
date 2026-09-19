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
