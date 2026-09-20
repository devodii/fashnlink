import type { Ctx } from '@/lib/adapter';
import { err, ok, type Result } from '@/lib/result';
import { ROUTING, type ProviderKey } from '@/config/models';
import type { GarmentCategory } from '@/db/schema';
import { fashnProvider } from './providers/fashn';
import { nanoBananaProvider } from './providers/nano-banana';
import { openaiImageProvider } from './providers/openai-image';
import type { RenderInput, RenderProvider, SubmitResult } from './types';

const PROVIDERS: Record<ProviderKey, RenderProvider> = {
  fashn: fashnProvider,
  nano_banana: nanoBananaProvider,
  openai_image: openaiImageProvider,
};

export function getProvider(key: ProviderKey): RenderProvider {
  return PROVIDERS[key];
}

// Only retries a failed submission with the next provider in the chain; a
// render that submits fine but later fails via webhook is the caller's
// refund path, not this function's concern.
export async function submitWithRouting(
  category: GarmentCategory,
  input: RenderInput,
  webhookUrl: string,
  ctx: Ctx,
  onAttempt?: (provider: ProviderKey) => Promise<void>,
): Promise<Result<SubmitResult & { provider: ProviderKey }>> {
  const chain = ROUTING[category];
  let lastError: Result<SubmitResult> | null = null;

  for (const key of chain) {
    const provider = getProvider(key);
    /**
     * openai_image's `submit()` delivers its own webhook synchronously,
     * before it returns, unlike fal's real async queue. The webhook route
     * looks up the render row and requires `provider` to already be set to
     * know how to parse the body; if that column is still null because the
     * caller only persists it after this call returns, the self-delivered
     * webhook 404s, `submit()` treats that as a submission failure, and the
     * "fallback" provider always fails. `onAttempt` lets the caller persist
     * the in-flight provider before this specific attempt, closing that
     * race for every provider, not just the synchronous one.
     */
    if (onAttempt) await onAttempt(key);
    const result = await provider.submit(input, webhookUrl, ctx);
    if (result.ok) return ok({ ...result.value, provider: key });
    lastError = result;
    ctx.log.warn(
      { provider: key, error: result.error },
      'render provider submission failed, trying next',
    );
  }

  return err(
    lastError?.ok === false
      ? lastError.error
      : {
          code: 'RENDER_FAILED',
          message: 'no render provider configured for category',
          meta: { category },
        },
  );
}

export * from './types';
