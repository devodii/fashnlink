import 'server-only';

import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { leads, products, renders } from '@/db/schema';
import type { Lead, ResolvedLead } from '@/db/schema';
import { newId } from '@/lib/ids';

type CreateLeadInput = Pick<
  Lead,
  'merchantId' | 'shopperId' | 'productId' | 'renderId' | 'email' | 'source'
>;

export async function createLeads(inputs: CreateLeadInput[]): Promise<Lead[]> {
  if (inputs.length === 0) return [];
  return Promise.all(
    inputs.map(async (input) => {
      const [row] = await db
        .insert(leads)
        .values({ id: newId('lead'), ...input })
        .onConflictDoUpdate({
          target: [leads.merchantId, leads.shopperId, leads.productId],
          set: { email: input.email, renderId: input.renderId },
        })
        .returning();
      return row;
    }),
  ).then((rows) => rows.filter((r): r is Lead => Boolean(r)));
}

export async function retrieveLeads(filters: {
  merchantId?: string;
  linkIds?: string[];
}): Promise<ResolvedLead[]> {
  if (filters.linkIds?.length) {
    const rows = await db
      .select({ lead: leads })
      .from(leads)
      .innerJoin(renders, eq(renders.id, leads.renderId))
      .where(inArray(renders.linkId, filters.linkIds))
      .orderBy(desc(leads.createdAt));
    return rows.map(({ lead }) => ({ ...lead }));
  }

  if (filters.merchantId) {
    const rows = await db
      .select({ lead: leads, productTitle: products.title })
      .from(leads)
      .innerJoin(products, eq(products.id, leads.productId))
      .where(eq(leads.merchantId, filters.merchantId))
      .orderBy(desc(leads.createdAt));

    const countByEmail = new Map<string, number>();
    for (const { lead } of rows) {
      countByEmail.set(lead.email, (countByEmail.get(lead.email) ?? 0) + 1);
    }

    return rows.map(({ lead, productTitle }) => ({
      ...lead,
      productTitle,
      count: countByEmail.get(lead.email) ?? 1,
    }));
  }

  return [];
}
