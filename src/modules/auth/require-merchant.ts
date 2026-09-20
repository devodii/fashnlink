import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { auth } from './auth';
import { db } from '@/db';
import { merchants } from '@/db/schema';

/**
 * Both the dashboard layout and every dashboard page call this; `cache`
 * dedupes it to one session check + one DB lookup per request instead of
 * one per component.
 */
export const requireMerchant = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.email) redirect('/login');

  const [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.email, session.user.email))
    .limit(1);

  if (!merchant) redirect('/login');
  return merchant;
});
