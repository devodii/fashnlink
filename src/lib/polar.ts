import { Polar } from '@polar-sh/sdk';
import { env } from '@/lib/env';

// Optional in dev (section 3, same null-safety convention as resend/redis) —
// a dev placeholder token still constructs a client, it just can't reach
// Polar's API.
export const polar = env.POLAR_ACCESS_TOKEN
  ? new Polar({ accessToken: env.POLAR_ACCESS_TOKEN })
  : null;
