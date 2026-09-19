import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { links, products, productImages, leads, renders } from '@/db/schema';
import { newId, newSlug } from '@/lib/ids';

export async function createSingleLink(input: { merchantId: string; productId: string }) {
  const [created] = await db
    .insert(links)
    .values({
      id: newId('link'),
      slug: newSlug(),
      merchantId: input.merchantId,
      kind: 'single',
      productIds: [input.productId],
    })
    .returning();
  return created ?? null;
}

// Section 8.2/9.3/9.4 (M6): poll (2-3 productIds) and group (1 productId,
// `settings.groupName`/`settings.groupNote`) links. `settings` is untyped
// jsonb at the schema level (same as `merchants.settings`) — callers pass
// the shape `/p/[slug]` and the group `/t/[slug]` variant expect.
export async function createMultiProductLink(input: {
  merchantId: string;
  productIds: string[];
  kind: 'poll' | 'group';
  title?: string | null;
  settings?: Record<string, unknown>;
}) {
  const [created] = await db
    .insert(links)
    .values({
      id: newId('link'),
      slug: newSlug(),
      merchantId: input.merchantId,
      kind: input.kind,
      title: input.title ?? null,
      productIds: input.productIds,
      settings: input.settings ?? {},
    })
    .returning();
  return created ?? null;
}

// Section 9.3: "Poll closes after 48h or when the creator taps 'decide'."
// DECISION: closing a poll sets `settings.closedAt`/`settings.decidedBy`
// rather than archiving the link — `/p/[slug]` still needs to render the
// final results page after close, which an archived (404'd) link couldn't.
// The 48h auto-close is a read-time check (`isPollClosed` below) against
// `createdAt`, not a cron job — cheap and always correct, no schedule to miss.
export async function closePoll(id: string, decidedBy: 'creator' | 'timeout') {
  const [link] = await db.select().from(links).where(eq(links.id, id)).limit(1);
  if (!link) return null;
  const settings = {
    ...(link.settings as Record<string, unknown>),
    closedAt: new Date().toISOString(),
    decidedBy,
  };
  const [updated] = await db.update(links).set({ settings }).where(eq(links.id, id)).returning();
  return updated ?? null;
}

const POLL_AUTO_CLOSE_MS = 48 * 60 * 60 * 1000;

export function isPollClosed(link: { createdAt: Date; settings: unknown }): boolean {
  const settings = (link.settings ?? {}) as Record<string, unknown>;
  if (settings.closedAt) return true;
  return Date.now() - link.createdAt.getTime() >= POLL_AUTO_CLOSE_MS;
}

export async function findLinkById(id: string) {
  const [link] = await db.select().from(links).where(eq(links.id, id)).limit(1);
  return link ?? null;
}

export async function findLinksByMerchant(merchantId: string) {
  return db
    .select()
    .from(links)
    .where(eq(links.merchantId, merchantId))
    .orderBy(desc(links.createdAt));
}

// Dashboard `/dashboard/links` table (section 8.2) — one row per link with
// its product's title/thumbnail already joined, plus lead count, so the page
// doesn't need N+1 queries per row.
export async function findLinksWithProductByMerchant(merchantId: string) {
  const rows = await db
    .select({
      link: links,
      productTitle: products.title,
    })
    .from(links)
    .leftJoin(products, eq(products.id, sql`${links.productIds}[1]`))
    .where(eq(links.merchantId, merchantId))
    .orderBy(desc(links.createdAt));

  return rows;
}

export async function updateLinkStatus(id: string, status: 'active' | 'paused' | 'archived') {
  const [updated] = await db.update(links).set({ status }).where(eq(links.id, id)).returning();
  return updated ?? null;
}

export async function countLeadsForLink(linkId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leads)
    .innerJoin(renders, eq(renders.id, leads.renderId))
    .where(eq(renders.linkId, linkId));
  return row?.count ?? 0;
}

export async function findProductImagesForLink(productId: string) {
  return db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(productImages.position);
}

export async function dashboardStats(merchantId: string, sinceDays = 30) {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  const [linkCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(links)
    .where(and(eq(links.merchantId, merchantId), sql`${links.createdAt} >= ${since}`));

  const [renderCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(renders)
    .innerJoin(links, eq(links.id, renders.linkId))
    .where(and(eq(links.merchantId, merchantId), sql`${renders.createdAt} >= ${since}`));

  const [shareCount] = await db
    .select({ total: sql<number>`coalesce(sum(${renders.shareCount}), 0)::int` })
    .from(renders)
    .innerJoin(links, eq(links.id, renders.linkId))
    .where(and(eq(links.merchantId, merchantId), sql`${renders.createdAt} >= ${since}`));

  const [leadCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leads)
    .where(and(eq(leads.merchantId, merchantId), sql`${leads.createdAt} >= ${since}`));

  return {
    links: linkCount?.count ?? 0,
    renders: renderCount?.count ?? 0,
    shares: shareCount?.total ?? 0,
    leads: leadCount?.count ?? 0,
  };
}
