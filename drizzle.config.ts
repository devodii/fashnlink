import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.local' });

// DECISION: drizzle-kit is a separate CLI process; it reads DATABASE_URL(_UNPOOLED)
// directly via dotenv rather than importing src/lib/env.ts, so migrations aren't
// coupled to the full app env schema (fal/openai/r2 keys it never needs).
const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL or DATABASE_URL_UNPOOLED must be set to run drizzle-kit');

export default defineConfig({
  schema: ['./src/db/schema.ts', './src/db/auth-schema.ts'],
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl },
});
