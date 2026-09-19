import { ImageResponse } from 'next/og';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/db';
import { links, merchants, products, renders } from '@/db/schema';
import { env } from '@/lib/env';
import { formatPriceCents } from '@/lib/format';
import { err } from '@/lib/result';

const paramsSchema = z.object({ renderId: z.string() });
const querySchema = z.object({ format: z.enum(['story', 'link']).default('link') });

const SIZES = {
  story: { width: 1080, height: 1920 },
  link: { width: 1200, height: 630 },
} as const;

// Section 9.1: the share card — full-bleed render image, bottom-third solid
// token-colored panel (no gradients, section 10.2), merchant/product/price
// and the "See it on you" short URL. `next/og` runs server-side with no
// external API dependency, so — unlike render/twin generation — this is
// fully provable without a real FAL_KEY/OPENAI_API_KEY.
export const GET = apiHandler({
  name: 'og.render',
  auth: ['public'],
  schema: { params: paramsSchema, query: querySchema },
  handler: async ({ params, query }) => {
    const [row] = await db
      .select({
        outputUrl: renders.outputUrl,
        productTitle: products.title,
        priceCents: products.priceCents,
        currency: products.currency,
        merchantName: merchants.name,
        slug: links.slug,
      })
      .from(renders)
      .innerJoin(products, eq(renders.productId, products.id))
      .innerJoin(links, eq(renders.linkId, links.id))
      .innerJoin(merchants, eq(links.merchantId, merchants.id))
      .where(eq(renders.id, params.renderId))
      .limit(1);

    if (!row || !row.outputUrl) {
      return err({ code: 'NOT_FOUND', message: 'render not found or not ready' });
    }

    const { width, height } = SIZES[query.format];
    const panelHeight = Math.round(height / 3);
    const shortUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/^https?:\/\//, '')}/r/${params.renderId}`;
    const price = formatPriceCents(row.priceCents, row.currency);

    return new ImageResponse(
      <div
        style={{
          width,
          height,
          display: 'flex',
          position: 'relative',
          // DECISION: Satori (next/og's render engine) doesn't reliably
          // parse oklch() — it silently fell back to black for both the
          // panel background and the text color, making the copy
          // invisible (confirmed empirically). Same reasoning as the fal
          // webhook's watermark composite (src/app/api/webhooks/fal): this
          // is a server-side raster, not a Tailwind class, so literal hex
          // approximations of the --background/--card/--foreground tokens
          // stand in here, never in actual component class names.
          backgroundColor: '#0a0a0a',
          fontFamily: 'sans-serif',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={row.outputUrl}
          width={width}
          height={height}
          style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width,
            height: panelHeight,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 8,
            padding: 48,
            backgroundColor: '#1f1f1f',
            color: '#fafafa',
          }}
        >
          <span style={{ fontSize: 22, opacity: 0.75 }}>{row.merchantName}</span>
          <span style={{ fontSize: 32, fontWeight: 600 }}>{row.productTitle}</span>
          {price && <span style={{ fontSize: 26, opacity: 0.9 }}>{price}</span>}
          <span style={{ fontSize: 24, opacity: 0.85 }}>See it on you — {shortUrl}</span>
        </div>
      </div>,
      { width, height },
    );
  },
});
