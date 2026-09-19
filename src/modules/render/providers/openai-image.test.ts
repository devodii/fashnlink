import { describe, expect, it, vi } from 'vitest';
import { childLogger } from '@/lib/log';

const editMock = vi.fn();
vi.mock('@/lib/openai', () => ({
  openai: { images: { edit: (...args: unknown[]) => editMock(...args) } },
}));

const { parseOpenaiWebhook, submitOpenaiEdit } = await import('./openai-image');

function makeCtx(fetchImpl: typeof fetch) {
  return {
    log: childLogger('openai-image-test'),
    requestId: 'openai-image-test',
    deadlineMs: Date.now() + 5_000,
    fetch: fetchImpl,
  };
}

describe('parseOpenaiWebhook', () => {
  it('parses a successful self-posted payload', () => {
    const result = parseOpenaiWebhook({
      providerJobId: 'job-1',
      status: 'succeeded',
      imageUrl: 'data:image/png;base64,abc',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('succeeded');
      expect(result.value.imageUrl).toBe('data:image/png;base64,abc');
    }
  });

  it('rejects a payload missing required fields', () => {
    const result = parseOpenaiWebhook({ status: 'succeeded' });
    expect(result.ok).toBe(false);
  });
});

describe('submitOpenaiEdit', () => {
  it('fetches the input images, edits, and posts the result to the webhook url', async () => {
    editMock.mockResolvedValueOnce({ data: [{ b64_json: 'abc123' }] });
    const webhookCalls: { url: string; body: string }[] = [];
    const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
      if (init) {
        webhookCalls.push({ url: String(url), body: String(init.body) });
        return new Response(null, { status: 200 });
      }
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    }) as typeof fetch;

    const result = await submitOpenaiEdit(
      'edit this',
      ['https://fake.ufs.sh/f/twin', 'https://fake.ufs.sh/f/garment'],
      'https://example.com/api/webhooks/fal?secret=s&kind=render&id=r1',
      makeCtx(fetchImpl),
    );

    expect(result.ok).toBe(true);
    expect(editMock).toHaveBeenCalledOnce();
    expect(webhookCalls).toHaveLength(1);
    const posted = JSON.parse(webhookCalls[0].body);
    expect(posted.status).toBe('succeeded');
    expect(posted.imageUrl).toBe('data:image/png;base64,abc123');
  });

  it('returns an error without posting to the webhook when the edit call throws', async () => {
    editMock.mockRejectedValueOnce(new Error('openai down'));
    let webhookCalled = false;
    const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
      if (init) webhookCalled = true;
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    }) as typeof fetch;

    const result = await submitOpenaiEdit(
      'edit this',
      ['https://fake.ufs.sh/f/twin', 'https://fake.ufs.sh/f/garment'],
      'https://example.com/api/webhooks/fal?secret=s&kind=render&id=r1',
      makeCtx(fetchImpl),
    );

    expect(result.ok).toBe(false);
    expect(webhookCalled).toBe(false);
  });

  it('returns an error when the edit call succeeds but returns no image data', async () => {
    editMock.mockResolvedValueOnce({ data: [{}] });
    const fetchImpl = (async () =>
      new Response(new Uint8Array([1, 2, 3]), { status: 200 })) as typeof fetch;

    const result = await submitOpenaiEdit(
      'edit this',
      ['https://fake.ufs.sh/f/twin'],
      'https://example.com/api/webhooks/fal?secret=s&kind=render&id=r1',
      makeCtx(fetchImpl),
    );

    expect(result.ok).toBe(false);
  });
});
