import 'server-only';

import { inArray } from 'drizzle-orm';
import { db } from '@/db';
import { renders } from '@/db/schema';
import type { Render } from '@/db/schema';

export async function retrieveRenders(filters: { ids?: string[] }): Promise<Render[]> {
  if (!filters.ids?.length) return [];
  return db.select().from(renders).where(inArray(renders.id, filters.ids));
}
