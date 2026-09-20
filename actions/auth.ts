import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { magicLink } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { db } from '@/db';
import { merchants, user, session, account, verification } from '@/db/schema';
import { env } from '@/lib/env';
import { newId } from '@/lib/ids';
import { logger } from '@/lib/log';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

async function sendMagicLink(email: string, url: string) {
  if (!resend) {
    logger.info({ email, url }, 'magic link (dev, RESEND_API_KEY not set)');
    return;
  }
  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: email,
    subject: 'Sign in',
    html: `<p>Click to sign in: <a href="${url}">${url}</a></p>`,
  });
}

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification },
  }),
  emailAndPassword: { enabled: false },
  socialProviders:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
      : undefined,
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLink(email, url);
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
