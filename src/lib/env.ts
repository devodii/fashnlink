import { z } from 'zod';

// Nothing else in the codebase reads process.env directly (section 3). Every
// consumer imports `env` from here so a missing var fails fast at boot with a
// readable message instead of surfacing as an obscure runtime error later.

const isProd = process.env.NODE_ENV === 'production';

// Only these are required in local development; everything else may be empty
// so `pnpm dev` boots without a full production credential set (section 3).
const devRequired = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  APP_SECRET: z.string().min(32, 'APP_SECRET must be at least 32 characters'),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  FAL_KEY: z.string().min(1, 'FAL_KEY is required'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  // DECISION: storage backend switched from Cloudflare R2 (spec section 2/3)
  // to UploadThing per user request mid-build — one token replaces the whole
  // R2 credential block. UploadThing's v7 SDK reads a single UPLOADTHING_TOKEN
  // (dashboard → API Keys), not separate secret/app-id vars.
  UPLOADTHING_TOKEN: z.string().min(1, 'UPLOADTHING_TOKEN is required'),
});

// Required in production only (section 3: "Required in production: everything
// except the Optional block and Google OAuth").
const prodOnlyRequired = z.object({
  DATABASE_URL_UNPOOLED: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_FOUNDING_PASS_PAYMENT_LINK: z.string().min(1),
  STRIPE_FOUNDING_PASS_PRICE_ID: z.string().min(1),
  ENCRYPTION_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().min(1),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  CRON_SECRET: z.string().min(1),
  FAL_WEBHOOK_SECRET: z.string().min(1),
});

const optional = z.object({
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL_UNPOOLED: z.string().optional(),
  BETTER_AUTH_URL: z.string().default('http://localhost:3000'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('App <hello@example.com>'),
  FAL_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_FOUNDING_PASS_PAYMENT_LINK: z.string().optional(),
  STRIPE_FOUNDING_PASS_PRICE_ID: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  SCRAPER_WORKER_URL: z.string().optional(),
  SCRAPER_WORKER_SECRET: z.string().optional(),
  SCRAPER_PROXY_URL: z.string().optional(),
  POSTHOG_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().default('https://us.i.posthog.com'),
  SENTRY_DSN: z.string().optional(),
});

const schema = isProd
  ? devRequired.merge(prodOnlyRequired).merge(optional)
  : devRequired.merge(prodOnlyRequired.partial()).merge(optional);

function loadEnv() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(
      `\nInvalid or missing environment variables:\n${missing}\n\nCheck .env.example for the full list.\n`,
    );
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;
