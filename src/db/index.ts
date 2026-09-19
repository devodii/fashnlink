import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '@/lib/env';
import * as schema from '@/db/schema';
import * as authSchema from '@/db/auth-schema';

// DECISION: standard `pg`/node-postgres over TCP, not `@neondatabase/serverless`'s
// HTTP driver — the HTTP driver can only reach Neon's own proxy, which made
// local dev against a plain (docker-compose) Postgres impossible. Neon also
// speaks standard Postgres wire protocol on port 5432, so this one driver
// works unchanged against local Postgres (dev) and Neon (prod) — no more
// dual-driver split between the app runtime and src/db/migrate.ts.
const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle(pool, { schema: { ...schema, ...authSchema } });
