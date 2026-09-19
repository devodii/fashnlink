import { config } from 'dotenv';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

config({ path: '.env.local' });

// `drizzle-kit migrate` auto-selects a websocket-only Neon driver whenever
// one is installed in the project, which cannot reach a plain local
// Postgres. This script runs migrations through a plain TCP `pg` connection
// instead, so it works against both local Postgres (dev) and Neon (prod).
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
