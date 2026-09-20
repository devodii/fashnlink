import { PayKit } from '@paykit-sdk/core';
import { createPolar } from '@paykit-sdk/polar';
import { env } from '@/lib/env';

export const paykit = env.POLAR_ACCESS_TOKEN
  ? new PayKit(
      createPolar({
        accessToken: env.POLAR_ACCESS_TOKEN,
        isSandbox: env.NODE_ENV !== 'production',
      }),
    )
  : null;
