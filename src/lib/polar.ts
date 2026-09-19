import { Polar } from '@polar-sh/sdk';
import { env } from '@/lib/env';

export const polar = env.POLAR_ACCESS_TOKEN
  ? new Polar({ accessToken: env.POLAR_ACCESS_TOKEN })
  : null;
