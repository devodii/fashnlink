import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { auth } from './auth';
import { db } from '@/db';
import { merchants } from '@/db/schema';

// Page-level gate for every `/dashboard/*` and `/onboarding` Server
// Component (section 8.2: "auth required"). Mirrors `apiHandler`'s
// `merchant_session` resolution (src/lib/api-handler.ts) but for pages,
// which don't go through that util — redirects rather than returning a 401.
export async function requireMerchant() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.email) redirect('/login');

  const [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.email, session.user.email))
    .limit(1);

  if (!merchant) redirect('/login');
  return merchant;
}
