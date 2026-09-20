import { describe, expect, it, vi } from 'vitest';
import { getProvider, submitWithRouting } from './index';
import { childLogger } from '@/lib/log';
import { createFetch } from '@/lib/http';
import type { RenderInput } from './types';

const ctx = {
  log: childLogger('render-index-test'),
  requestId: 'render-index-test',
  deadlineMs: Date.now() + 5_000,
  fetch: createFetch({ log: childLogger('render-index-test') }),
};

const input: RenderInput = {
  twinUrl: 'https://fake.ufs.sh/f/twin',
  garmentUrl: 'https://fake.ufs.sh/f/garment',
  category: 'top',
  garmentPhotoType: 'flat-lay',
};

describe('getProvider', () => {
  it('returns the matching provider for each key', () => {
    expect(getProvider('fashn').key).toBe('fashn');
    expect(getProvider('nano_banana').key).toBe('nano_banana');
    expect(getProvider('openai_image').key).toBe('openai_image');
  });
});

describe('submitWithRouting', () => {
  it('tries the first provider in the category chain and uses it on success', async () => {
    const fashn = getProvider('fashn');
    const spy = vi
      .spyOn(fashn, 'submit')
      .mockResolvedValue({ ok: true, value: { providerJobId: 'job-1' } });

    const result = await submitWithRouting('top', input, 'https://example.com/webhook', ctx);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.provider).toBe('fashn');
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it('falls back to the next provider in the chain when the first fails', async () => {
    const fashn = getProvider('fashn');
    const nanoBanana = getProvider('nano_banana');
    const fashnSpy = vi
      .spyOn(fashn, 'submit')
      .mockResolvedValue({ ok: false, error: { code: 'RENDER_FAILED', message: 'fashn down' } });
    const nanoBananaSpy = vi
      .spyOn(nanoBanana, 'submit')
      .mockResolvedValue({ ok: true, value: { providerJobId: 'job-2' } });

    const result = await submitWithRouting('top', input, 'https://example.com/webhook', ctx);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.provider).toBe('nano_banana');
    expect(fashnSpy).toHaveBeenCalledOnce();
    expect(nanoBananaSpy).toHaveBeenCalledOnce();
    fashnSpy.mockRestore();
    nanoBananaSpy.mockRestore();
  });

  it('routes shoes/accessory categories to nano_banana first', async () => {
    const nanoBanana = getProvider('nano_banana');
    const spy = vi
      .spyOn(nanoBanana, 'submit')
      .mockResolvedValue({ ok: true, value: { providerJobId: 'job-3' } });

    const result = await submitWithRouting('shoes', input, 'https://example.com/webhook', ctx);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.provider).toBe('nano_banana');
    spy.mockRestore();
  });

  it('falls back to openai_image when nano_banana fails for set categories', async () => {
    const nanoBanana = getProvider('nano_banana');
    const openaiImage = getProvider('openai_image');
    const nanoBananaSpy = vi.spyOn(nanoBanana, 'submit').mockResolvedValue({
      ok: false,
      error: { code: 'RENDER_FAILED', message: 'nano_banana down' },
    });
    const openaiSpy = vi
      .spyOn(openaiImage, 'submit')
      .mockResolvedValue({ ok: true, value: { providerJobId: 'job-4' } });

    const result = await submitWithRouting('set', input, 'https://example.com/webhook', ctx);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.provider).toBe('openai_image');
    nanoBananaSpy.mockRestore();
    openaiSpy.mockRestore();
  });

  it('calls onAttempt with the provider key before invoking submit for that provider, on every attempt', async () => {
    // Regression test: openai_image's submit() delivers its own fal-style
    // webhook synchronously, before it returns, and the webhook route
    // requires the render row's `provider` column to already name it. If a
    // caller only persisted `provider` after submitWithRouting returned,
    // that self-delivered webhook 404'd and every openai_image fallback
    // silently failed. onAttempt must fire before each provider.submit()
    // call, not just once at the end.
    const nanoBanana = getProvider('nano_banana');
    const openaiImage = getProvider('openai_image');
    const attempts: string[] = [];
    const callOrder: string[] = [];

    const nanoBananaSpy = vi.spyOn(nanoBanana, 'submit').mockImplementation(async () => {
      callOrder.push('nano_banana.submit');
      return { ok: false, error: { code: 'RENDER_FAILED', message: 'nano_banana down' } };
    });
    const openaiSpy = vi.spyOn(openaiImage, 'submit').mockImplementation(async () => {
      callOrder.push('openai_image.submit');
      return { ok: true, value: { providerJobId: 'job-5' } };
    });

    const result = await submitWithRouting(
      'set',
      input,
      'https://example.com/webhook',
      ctx,
      async (provider) => {
        attempts.push(provider);
        callOrder.push(`onAttempt:${provider}`);
      },
    );

    expect(result.ok).toBe(true);
    expect(attempts).toEqual(['nano_banana', 'openai_image']);
    expect(callOrder).toEqual([
      'onAttempt:nano_banana',
      'nano_banana.submit',
      'onAttempt:openai_image',
      'openai_image.submit',
    ]);
    nanoBananaSpy.mockRestore();
    openaiSpy.mockRestore();
  });
});
