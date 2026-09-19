'use client';

import { createAuthClient } from 'better-auth/react';
import { magicLinkClient } from 'better-auth/client/plugins';

// Client-side counterpart to src/modules/auth/auth.ts. NEXT_PUBLIC_APP_URL is
// the only env var this needs, so it reads process.env directly rather than
// importing src/lib/env.ts (server-only validated vars) into client code.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [magicLinkClient()],
});
