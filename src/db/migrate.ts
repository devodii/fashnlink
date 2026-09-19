import { config } from 'dotenv';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

config({ path: '.env.local' });

/**
 * DECISION: the app runtime uses `@neondatabase/serverless` (websocket/HTTP,
 * the right driver for Vercel's edge/serverless functions), but that driver
 * can only reach a real Neon/Vercel Postgres/Supabase endpoint over
 * websocket; it can't talk to a plain local Postgres, and `drizzle-kit
 * migrate` auto-selects it just because it's installed. This script runs
 * migrations through a plain TCP `pg` connection instead, so `pnpm db:migrate`
 * works against both local Postgres (dev) and Neon (prod; Neon also speaks
 * standard Postgres wire protocol on port 5432, not just websocket).
 */
const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error('DATABASE_URL or DATABASE_URL_UNPOOLED must be set to run migrations');

async function main() {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  await pool.end();
  console.log('migrations applied');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
