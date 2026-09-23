import { z } from 'zod';
import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-handler';
import { err } from '@/lib/result';
import { retrieveStores } from '@/actions/stores';
import { generateTrackingScript } from '@/modules/tracking/script';

const querySchema = z.object({ s: z.string().min(1) });

export const GET = apiHandler({
  name: 'track.script',
  auth: ['public'],
  schema: { query: querySchema },
  handler: async ({ query }) => {
    const [store] = await retrieveStores({ trackingToken: query.s });
    if (!store) return err({ code: 'NOT_FOUND', message: 'Unknown tracking token' });

    return new NextResponse(generateTrackingScript(query.s), {
      headers: {
        'content-type': 'application/javascript; charset=utf-8',
        'cache-control': 'public, max-age=300, s-maxage=3600',
      },
    });
  },
});
