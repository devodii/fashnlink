import { Resend } from 'resend';
import { env } from '@/lib/env';
import { logger } from '@/lib/log';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

// DECISION: `src/modules/auth/auth.ts` has its own near-identical
// Resend-or-console-log helper for magic links, predating this one — not
// unified here to avoid touching that already-tested M1 file under this
// milestone's time budget. A future pass should collapse them into one.
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!resend) {
    // Section 3: "Email may log to console in dev if RESEND_API_KEY is empty."
    logger.info({ to, subject }, 'email (dev — RESEND_API_KEY not set)');
    return;
  }
  await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html });
}
