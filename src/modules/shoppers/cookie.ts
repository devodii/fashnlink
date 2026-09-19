import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { shoppers } from '@/db/schema';
import { newId } from '@/lib/ids';
import { env } from '@/lib/env';

// Section 3/8.3: shoppers are anonymous by default, identified by a signed
// `shopper_id` cookie — never a bare id (that would let anyone forge another
// shopper's cookie and read/delete their closet). The cookie value is
// `${shopperId}.${hmac}`; `shoppers.cookieId` mirrors `shoppers.id` rather
// than being a second independent token — the HMAC is what makes the cookie
// unforgeable, a distinct DB-side token would add nothing.
const COOKIE_NAME = 'shopper_id';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 400; // ~400 days — the practical browser cap on Set-Cookie Max-Age

function sign(shopperId: string): string {
  const mac = createHmac('sha256', env.APP_SECRET).update(shopperId).digest('base64url');
  return `${shopperId}.${mac}`;
}

function verify(token: string): string | null {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const shopperId = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = createHmac('sha256', env.APP_SECRET).update(shopperId).digest('base64url');

  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return shopperId;
}

// Read-only lookup for Server Components, which cannot set cookies during
// render (Next.js only allows cookie mutation from a Server Action or Route
// Handler). Returns null if there's no shopper yet — callers render the
// "not yet identified" state and let the first mutation (an API route call)
// create one via `getOrCreateShopperId` below.
export async function readShopperId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  return raw ? verify(raw) : null;
}

// Resolves the shopper for the current request, creating a `shoppers` row
// and setting the cookie if none exists yet. Only callable from a Route
// Handler / Server Action — this is what `AuthScope: 'shopper_session'`
// resolves through in src/lib/api-handler.ts.
export async function getOrCreateShopperId(): Promise<string> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  const existing = raw ? verify(raw) : null;
  if (existing) return existing;

  const shopperId = newId('shopper');
  await db.insert(shoppers).values({ id: shopperId, cookieId: shopperId });

  store.set(COOKIE_NAME, sign(shopperId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });

  return shopperId;
}
