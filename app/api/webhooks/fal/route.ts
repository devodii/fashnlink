import { z } from 'zod';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { apiHandler } from '@/lib/api-handler';
import { env } from '@/lib/env';
import { db } from '@/db';
import { campaignItems, campaigns, links, merchants, renders } from '@/db/schema';
import { retrieveTwins, updateTwins } from '@/actions/twins';
import { childLogger } from '@/lib/log';
import { createFetch } from '@/lib/http';
import { err, ok } from '@/lib/result';
import { getProvider } from '@/modules/render';
import type { ProviderKey } from '@/constants';
import { PROVIDER_COST_CENTS } from '@/constants';
import { putObject } from '@/modules/storage';
import { refundFailedRender } from '@/modules/render/credit-ledger';
import { checkCampaignHealth } from '@/modules/campaigns';

const querySchema = z.object({
  kind: z.enum(['twin', 'render']),
  id: z.string(),
});

export const POST = apiHandler({
  name: 'webhooks.fal',
  auth: ['webhook'],
  schema: { query: querySchema },
  webhookVerify: (req) => {
    const secret = req.nextUrl.searchParams.get('secret');
    if (!secret || !env.FAL_WEBHOOK_SECRET || secret !== env.FAL_WEBHOOK_SECRET) {
      return err({ code: 'UNAUTHORIZED', message: 'invalid fal webhook secret' });
    }
    return ok(undefined);
  },
  handler: async ({ query, req, requestId }) => {
    const log = childLogger(requestId, { route: 'webhooks/fal', kind: query.kind, id: query.id });
    const ctx = { log, requestId, deadlineMs: Date.now() + 55_000, fetch: createFetch({ log }) };
    const body = await req.json().catch(() => null);

    if (query.kind === 'twin') {
      const [twin] = await retrieveTwins({ ids: [query.id] });
      if (!twin || !twin.provider) {
        return err({ code: 'NOT_FOUND', message: 'twin not found' });
      }
      // fal can redeliver the same webhook (standard retry behavior); once a
      // twin has reached a terminal state, ignore further deliveries rather
      // than re-downloading and re-uploading the same image.
      if (twin.status === 'ready' || twin.status === 'failed') {
        log.info({ twinId: twin.id, status: twin.status }, 'fal webhook redelivered, ignoring');
        return ok({ handled: true });
      }

      const provider = getProvider(twin.provider as ProviderKey);
      const parsed = provider.parseWebhook(body);
      if (!parsed.ok) return parsed;

      if (parsed.value.status === 'failed' || !parsed.value.imageUrl) {
        await updateTwins([twin.id], { status: 'failed' });
        log.warn({ error: parsed.value.error }, 'twin generation failed');
        return ok({ handled: true });
      }

      const imageResponse = await ctx.fetch(parsed.value.imageUrl);
      const bytes = Buffer.from(await imageResponse.arrayBuffer());
      const key = `twins/${twin.shopperId}/${twin.id}.png`;
      const uploaded = await putObject(key, bytes, 'image/png');

      await updateTwins([twin.id], {
        status: 'ready',
        twinR2Key: uploaded.key,
        twinUrl: uploaded.url,
      });

      return ok({ handled: true });
    }

    const [render] = await db.select().from(renders).where(eq(renders.id, query.id)).limit(1);
    if (!render || !render.provider) {
      return err({ code: 'NOT_FOUND', message: 'render not found' });
    }
    // Same redelivery guard as the twin branch above: without it, a
    // redelivered "failed" webhook would call refundFailedRender again
    // (double-granting credits back), and a redelivered "succeeded" webhook
    // would re-download and re-upload the output image.
    if (render.status === 'succeeded' || render.status === 'failed') {
      log.info({ renderId: render.id, status: render.status }, 'fal webhook redelivered, ignoring');
      return ok({ handled: true });
    }

    let merchantId: string | null = null;
    if (render.linkId) {
      const [link] = await db
        .select({ merchantId: links.merchantId })
        .from(links)
        .where(eq(links.id, render.linkId))
        .limit(1);
      if (!link) return err({ code: 'NOT_FOUND', message: 'render link not found' });
      merchantId = link.merchantId;
    } else {
      const [item] = await db
        .select({ merchantId: campaigns.merchantId })
        .from(campaignItems)
        .innerJoin(campaigns, eq(campaignItems.campaignId, campaigns.id))
        .where(eq(campaignItems.renderId, render.id))
        .limit(1);
      if (!item) return err({ code: 'NOT_FOUND', message: 'render campaign not found' });
      merchantId = item.merchantId;
    }

    const provider = getProvider(render.provider as ProviderKey);
    const parsed = provider.parseWebhook(body);
    if (!parsed.ok) return parsed;

    if (parsed.value.status === 'failed' || !parsed.value.imageUrl) {
      await db
        .update(renders)
        .set({ error: { message: parsed.value.error ?? 'render failed' }, status: 'failed' })
        .where(eq(renders.id, render.id));
      /**
       * Campaign renders are never individually credited; the whole
       * campaign's credits are reserved up front. Refunding per-render here
       * would over-credit the merchant, so this only fires for direct
       * (non-campaign) renders.
       */
      if (render.linkId && merchantId) {
        await refundFailedRender(merchantId, render.id);
      }
      if (render.via === 'campaign') {
        await db
          .update(campaignItems)
          .set({ status: 'failed', skipReason: parsed.value.error ?? 'render failed' })
          .where(eq(campaignItems.renderId, render.id));
        const [item] = await db
          .select({ campaignId: campaignItems.campaignId })
          .from(campaignItems)
          .where(eq(campaignItems.renderId, render.id))
          .limit(1);
        if (item) await checkCampaignHealth(item.campaignId);
      }
      log.warn({ error: parsed.value.error }, 'render failed, refunded');
      return ok({ handled: true });
    }

    const imageResponse = await ctx.fetch(parsed.value.imageUrl);
    let bytes = Buffer.from(await imageResponse.arrayBuffer());

    const [merchant] = await db
      .select({ watermarkEnabled: merchants.watermarkEnabled })
      .from(merchants)
      .where(eq(merchants.id, merchantId as string))
      .limit(1);
    const watermarked = merchant?.watermarkEnabled ?? true;

    if (watermarked) {
      /**
       * This is a server-side sharp raster composite, not a Tailwind class,
       * so it can't reference CSS variables; sharp needs literal color
       * values baked into the SVG string.
       */
      const metadata = await sharp(bytes).metadata();
      const width = metadata.width ?? 1024;
      const height = metadata.height ?? 1024;
      const scrimHeight = Math.round(height * 0.06);
      const svg = `<svg width="${width}" height="${height}"><rect x="0" y="${height - scrimHeight}" width="${width}" height="${scrimHeight}" fill="black" fill-opacity="0.4"/><text x="${width - 12}" y="${height - scrimHeight / 2 + 5}" text-anchor="end" font-size="${Math.round(scrimHeight * 0.5)}" fill="white" fill-opacity="0.9" font-family="sans-serif">try it on you</text></svg>`;
      bytes = await sharp(bytes)
        .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
        .toBuffer();
    }

    const key = `renders/${render.shopperId}/${render.id}.png`;
    const uploaded = await putObject(key, bytes, 'image/png');

    await db
      .update(renders)
      .set({
        status: 'succeeded',
        outputR2Key: uploaded.key,
        outputUrl: uploaded.url,
        watermarked,
        costCents: PROVIDER_COST_CENTS[render.provider as ProviderKey],
        latencyMs: render.createdAt ? Date.now() - render.createdAt.getTime() : null,
      })
      .where(eq(renders.id, render.id));

    if (render.via === 'campaign') {
      /** `delivered_at` is set later, when the ESP confirms the event, not here. */
      await db
        .update(campaignItems)
        .set({ status: 'rendered' })
        .where(eq(campaignItems.renderId, render.id));
      const [item] = await db
        .select({ campaignId: campaignItems.campaignId })
        .from(campaignItems)
        .where(eq(campaignItems.renderId, render.id))
        .limit(1);
      if (item) await checkCampaignHealth(item.campaignId);
    }

    return ok({ handled: true });
  },
});
