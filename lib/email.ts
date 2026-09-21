import { Resend } from 'resend';
import { env } from '@/lib/env';

const resend = new Resend(env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html });
}
