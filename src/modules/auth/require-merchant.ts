import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { auth } from './auth';
import { db } from '@/db';
import { merchants } from '@/db/schema';

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
