import 'server-only';

import { inArray } from 'drizzle-orm';
import { db } from '@/db';
import { renders } from '@tryonlink/shared/schema';
import type { Render } from '@tryonlink/shared/schema';

// Deliberately minimal and read-only: every render write path (status
// transitions, provider routing) stays in modules/render and modules/campaigns,
// tightly coupled to credit-ledger correctness. This only covers the simple
// "look up a render by id" lookup duplicated verbatim across call sites.
export async function retrieveRenders(filters: { ids?: string[] }): Promise<Render[]> {
  if (!filters.ids?.length) return [];
  return db.select().from(renders).where(inArray(renders.id, filters.ids));
}
