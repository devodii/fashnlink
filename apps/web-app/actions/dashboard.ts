import 'server-only';

import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { leads, links, renders } from '@tryonlink/shared/schema';

export async function retrieveDashboard(
  merchantId: string,
  sinceDays = 30,
): Promise<{ links: number; renders: number; shares: number; leads: number }> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  const [[linkCount], [renderCount], [shareCount], [leadCount]] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(links)
      .where(and(eq(links.merchantId, merchantId), sql`${links.createdAt} >= ${since}`)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(renders)
      .innerJoin(links, eq(links.id, renders.linkId))
      .where(and(eq(links.merchantId, merchantId), sql`${renders.createdAt} >= ${since}`)),
    db
      .select({ total: sql<number>`coalesce(sum(${renders.shareCount}), 0)::int` })
      .from(renders)
      .innerJoin(links, eq(links.id, renders.linkId))
      .where(and(eq(links.merchantId, merchantId), sql`${renders.createdAt} >= ${since}`)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .where(and(eq(leads.merchantId, merchantId), sql`${leads.createdAt} >= ${since}`)),
  ]);

  return {
    links: linkCount?.count ?? 0,
    renders: renderCount?.count ?? 0,
    shares: shareCount?.total ?? 0,
    leads: leadCount?.count ?? 0,
  };
}
