import 'server-only';

import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { links, products } from '@/db/schema';
import type { Link, ResolvedLink } from '@/db/schema';
import { newId, newSlug } from '@/lib/ids';

const POLL_AUTO_CLOSE_MS = 48 * 60 * 60 * 1000;

type CreateLinkInput = Pick<Link, 'merchantId' | 'kind'> & {
  productIds: string[];
  title?: string | null;
  settings?: Record<string, unknown>;
};

export async function createLinks(inputs: CreateLinkInput[]): Promise<Link[]> {
  if (inputs.length === 0) return [];
  return db
    .insert(links)
    .values(
      inputs.map((input) => ({
        id: newId('link'),
        slug: newSlug(),
        merchantId: input.merchantId,
        kind: input.kind,
        title: input.title ?? null,
        productIds: input.productIds,
        settings: input.settings ?? {},
      })),
    )
    .returning();
}

function resolveLink(link: Link, product?: { title: string | null } | null): ResolvedLink {
  const resolved: ResolvedLink = { ...link };
  if (product !== undefined) resolved.product = product;
  if (link.kind === 'poll') {
    const settings = (link.settings ?? {}) as Record<string, unknown>;
    resolved.isClosed =
      Boolean(settings.closedAt) || Date.now() - link.createdAt.getTime() >= POLL_AUTO_CLOSE_MS;
  }
  return resolved;
}

export async function retrieveLinks(filters: {
  ids?: string[];
  slugs?: string[];
  merchantId?: string;
  withProduct?: boolean;
}): Promise<ResolvedLink[]> {
  const conditions = [
    filters.ids?.length ? inArray(links.id, filters.ids) : undefined,
    filters.slugs?.length ? inArray(links.slug, filters.slugs) : undefined,
    filters.merchantId ? eq(links.merchantId, filters.merchantId) : undefined,
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));
  if (conditions.length === 0) return [];

  if (filters.withProduct) {
    const rows = await db
      .select({ link: links, productTitle: products.title })
      .from(links)
      .leftJoin(products, eq(products.id, sql`${links.productIds}[1]`))
      .where(and(...conditions))
      .orderBy(desc(links.createdAt));
    return rows.map(({ link, productTitle }) => resolveLink(link, { title: productTitle }));
  }

  const rows = await db
    .select()
    .from(links)
    .where(and(...conditions))
    .orderBy(desc(links.createdAt));
  return rows.map((link) => resolveLink(link));
}

export async function updateLinks(
  ids: string[],
  patch: Partial<Pick<Link, 'status' | 'merchantId'>> & { settings?: Record<string, unknown> },
): Promise<Link[]> {
  if (ids.length === 0) return [];

  if (patch.settings !== undefined) {
    const existingRows = await db.select().from(links).where(inArray(links.id, ids));
    const updated = await Promise.all(
      existingRows.map(async (row) => {
        const [result] = await db
          .update(links)
          .set({
            ...(patch.status !== undefined ? { status: patch.status } : {}),
            ...(patch.merchantId !== undefined ? { merchantId: patch.merchantId } : {}),
            settings: { ...(row.settings as Record<string, unknown>), ...patch.settings },
          })
          .where(eq(links.id, row.id))
          .returning();
        return result;
      }),
    );
    return updated.filter((r): r is Link => Boolean(r));
  }

  const liveFields: Partial<Pick<Link, 'status' | 'merchantId'>> = {};
  if (patch.status !== undefined) liveFields.status = patch.status;
  if (patch.merchantId !== undefined) liveFields.merchantId = patch.merchantId;
  if (Object.keys(liveFields).length === 0) return [];

  return db.update(links).set(liveFields).where(inArray(links.id, ids)).returning();
}
