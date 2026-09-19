import type { Ctx } from '@/lib/adapter';
import { err, ok, type Result } from '@/lib/result';
import { ROUTING, type ProviderKey } from '@/config/models';
import type { GarmentCategory } from '@/modules/scraper/types';
import { fashnProvider } from './providers/fashn';
import { klingProvider } from './providers/kling';
import { nanoBananaProvider } from './providers/nano-banana';
import type { RenderInput, RenderProvider, SubmitResult } from './types';

const PROVIDERS: Record<ProviderKey, RenderProvider> = {
  fashn: fashnProvider,
  kling: klingProvider,
  nano_banana: nanoBananaProvider,
};

export function getProvider(key: ProviderKey): RenderProvider {
  return PROVIDERS[key];
}

// later fails via webhook (that's the caller's refund path, not a retry).
export async function submitWithRouting(
  category: GarmentCategory,
  input: RenderInput,
  webhookUrl: string,
  ctx: Ctx,
): Promise<Result<SubmitResult & { provider: ProviderKey }>> {
  const chain = ROUTING[category];
  let lastError: Result<SubmitResult> | null = null;

  for (const key of chain) {
    const provider = getProvider(key);
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
