import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '@/lib/env';
import * as schema from '@/db/schema';
import * as authSchema from '@/db/auth-schema';

// Neon speaks standard Postgres wire protocol on port 5432, not just its
// HTTP/websocket proxy, so plain node-postgres works unchanged against both
// local Postgres (dev) and Neon (prod).
const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle(pool, { schema: { ...schema, ...authSchema } });
