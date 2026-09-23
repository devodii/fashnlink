import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { magicLink } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { merchants, user, session, account, verification } from '@/db/schema';
import { env } from '@/lib/env';
import { newId } from '@/lib/ids';
import { sendEmail } from '@/lib/email';

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(
        user.email,
        'Reset your password',
        `<p>Click to reset your password: <a href="${url}">${url}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
      );
    },
  },
  socialProviders:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
      : undefined,
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendEmail(email, 'Sign in', `<p>Click to sign in: <a href="${url}">${url}</a></p>`);
      },
    }),
    nextCookies(),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const [existing] = await db
            .select({ id: merchants.id })
            .from(merchants)
            .where(eq(merchants.email, user.email))
            .limit(1);
          if (existing) return;
          await db.insert(merchants).values({
            id: newId('merch'),
            email: user.email,
            name: user.name || user.email.split('@')[0],
          });
        },
      },
    },
  },
});
