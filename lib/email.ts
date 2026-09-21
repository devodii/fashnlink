import { Resend } from 'resend';
import { env } from '@/lib/env';
import { logger } from '@/lib/log';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!resend) {
    logger.info({ to, subject }, 'email (dev, RESEND_API_KEY not set)');
    return;
  }
  await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html });
}
