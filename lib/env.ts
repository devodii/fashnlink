import { z } from 'zod';

const required = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_URL_UNPOOLED: z.string().min(1, 'DATABASE_URL_UNPOOLED is required'),
  APP_SECRET: z.string().min(32, 'APP_SECRET must be at least 32 characters'),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  FAL_KEY: z.string().min(1, 'FAL_KEY is required'),
  FAL_WEBHOOK_SECRET: z.string().min(1, 'FAL_WEBHOOK_SECRET is required'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  UPLOADTHING_TOKEN: z.string().min(1, 'UPLOADTHING_TOKEN is required'),
  AI_GATEWAY_API_KEY: z.string().min(1, 'AI_GATEWAY_API_KEY is required'),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  EMAIL_FROM: z.string().min(1, 'EMAIL_FROM is required'),
  POLAR_ACCESS_TOKEN: z.string().min(1, 'POLAR_ACCESS_TOKEN is required'),
  POLAR_WEBHOOK_SECRET: z.string().min(1, 'POLAR_WEBHOOK_SECRET is required'),
  POLAR_FOUNDING_PASS_PRODUCT_ID: z.string().min(1, 'POLAR_FOUNDING_PASS_PRODUCT_ID is required'),
  ENCRYPTION_KEY: z.string().min(1, 'ENCRYPTION_KEY is required'),
  UPSTASH_REDIS_REST_URL: z.string().min(1, 'UPSTASH_REDIS_REST_URL is required'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN is required'),
  CRON_SECRET: z.string().min(1, 'CRON_SECRET is required'),
});

const optional = z.object({
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  TUNNEL_URL: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BETTER_AUTH_URL: z.string().default('http://localhost:3000'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  SCRAPER_WORKER_URL: z.string().optional(),
  SCRAPER_WORKER_SECRET: z.string().optional(),
  SCRAPER_PROXY_URL: z.string().optional(),
  POSTHOG_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().default('https://us.i.posthog.com'),
  SENTRY_DSN: z.string().optional(),
});

const schema = required.extend(optional.shape);

function loadEnv() {
  try {
    return schema.parse(process.env);
  } catch (cause) {
    if (cause instanceof z.ZodError) {
      const missing = cause.issues
        .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      throw new Error(
        `Invalid or missing environment variables:\n${missing}\n\nCheck .env.example for the full list.`,
      );
    }
    throw cause;
  }
}

export const env = loadEnv();
export type Env = typeof env;

export const publicUrl = env.TUNNEL_URL || env.NEXT_PUBLIC_APP_URL;
