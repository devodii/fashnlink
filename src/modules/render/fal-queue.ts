import { env } from '@/lib/env';
import { err, ok, type Result } from '@/lib/result';
import type { Ctx } from '@/lib/adapter';
import type { SubmitResult } from './types';

/**
 * Endpoint shape verified against fal.ai/docs/model-endpoints/queue:
 * POST https://queue.fal.run/{modelId}, `Authorization: Key $FAL_KEY`,
 * webhook delivered via the `fal_webhook` query param.
 */
export async function submitToFalQueue(
  modelId: string,
  body: Record<string, unknown>,
  webhookUrl: string,
  ctx: Ctx,
): Promise<Result<SubmitResult>> {
  const url = `https://queue.fal.run/${modelId}?fal_webhook=${encodeURIComponent(webhookUrl)}`;

  try {
    const response = await ctx.fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Key ${env.FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return err({
        code: 'RENDER_FAILED',
        message: `fal queue submission failed (${response.status})`,
        meta: { status: response.status, body: text },
      });
    }

    const data = (await response.json()) as { request_id?: string };
    if (!data.request_id) {
      return err({ code: 'RENDER_FAILED', message: 'fal queue response missing request_id' });
    }

    return ok({ providerJobId: data.request_id });
  } catch (cause) {
    ctx.log.error({ cause, modelId }, 'fal queue submission threw');
    return err({ code: 'RENDER_FAILED', message: 'fal queue submission failed', cause });
  }
}
