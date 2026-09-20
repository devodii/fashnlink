import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { links, products, linkKindEnum, linkStatusEnum } from '@/db/schema';
import { newId, newSlug } from '@/lib/ids';

type LinkKind = (typeof linkKindEnum.enumValues)[number];
type LinkStatus = (typeof linkStatusEnum.enumValues)[number];

const POLL_AUTO_CLOSE_MS = 48 * 60 * 60 * 1000;

// Not a CRUD verb itself, so it stays as an unexported helper folded into
// readLink rather than its own export.
function isPollClosed(link: { createdAt: Date; settings: unknown }): boolean {
  const settings = (link.settings ?? {}) as Record<string, unknown>;
  if (settings.closedAt) return true;
  return Date.now() - link.createdAt.getTime() >= POLL_AUTO_CLOSE_MS;
}

export async function createLink(
  input:
    | { kind: 'single'; merchantId: string; productId: string }
    | {
        kind: 'poll' | 'group';
        merchantId: string;
        productIds: string[];
        title?: string | null;
        settings?: Record<string, unknown>;
      },
) {
  const productIds = input.kind === 'single' ? [input.productId] : input.productIds;
  const [created] = await db
    .insert(links)
    .values({
      id: newId('link'),
      slug: newSlug(),
      merchantId: input.merchantId,
      kind: input.kind,
      title: input.kind === 'single' ? null : (input.title ?? null),
      productIds,
      settings: input.kind === 'single' ? {} : (input.settings ?? {}),
    })
    .returning();
  return created ?? null;
}

export async function readLink(params: {
  id: string;
}): Promise<(typeof links.$inferSelect & { isClosed?: boolean }) | null>;
export async function readLink(params: {
  slug: string;
}): Promise<(typeof links.$inferSelect & { isClosed?: boolean }) | null>;
export async function readLink(params: {
  merchantId: string;
  withProduct: true;
}): Promise<{ link: typeof links.$inferSelect; productTitle: string | null }[]>;
export async function readLink(params: {
  merchantId: string;
}): Promise<(typeof links.$inferSelect)[]>;
export async function readLink(params: {
  id?: string;
  slug?: string;
  merchantId?: string;
  withProduct?: boolean;
}): Promise<unknown> {
  if (params.id || params.slug) {
    const condition = params.id ? eq(links.id, params.id) : eq(links.slug, params.slug!);
    const [link] = await db.select().from(links).where(condition).limit(1);
    if (!link) return null;
    if (link.kind === 'poll') return { ...link, isClosed: isPollClosed(link) };
    return link;
  }

  if (params.merchantId) {
    if (params.withProduct) {
      return db
        .select({ link: links, productTitle: products.title })
        .from(links)
        .leftJoin(products, eq(products.id, sql`${links.productIds}[1]`))
        .where(eq(links.merchantId, params.merchantId))
        .orderBy(desc(links.createdAt));
    }

    return db
      .select()
      .from(links)
      .where(eq(links.merchantId, params.merchantId))
      .orderBy(desc(links.createdAt));
  }

  return null;
}

export async function updateLink(
  id: string,
  patch: { status?: LinkStatus; settings?: Record<string, unknown> },
) {
  const set: Record<string, unknown> = {};

  if (patch.status !== undefined) {
    set.status = patch.status;
  }

  if (patch.settings !== undefined) {
    // Merges into the existing row's settings rather than overwriting it, so
    // e.g. closing a poll (settings.closedAt/decidedBy) doesn't clobber other
    // settings keys already on the link.
    const [existing] = await db.select().from(links).where(eq(links.id, id)).limit(1);
    if (!existing) return null;
    set.settings = { ...(existing.settings as Record<string, unknown>), ...patch.settings };
  }

  const [updated] = await db.update(links).set(set).where(eq(links.id, id)).returning();
  return updated ?? null;
}

// links never had a hard-delete: they're only ever archived via
// updateLink(id, { status: 'archived' }), so there's no deleteLink export.

export type { LinkKind, LinkStatus };
