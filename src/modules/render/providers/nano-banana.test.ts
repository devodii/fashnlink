import { describe, expect, it } from 'vitest';
import { parseNanoBananaWebhook } from './nano-banana';

/**
 * Payload shape matches nano-banana-2/edit's documented response
 * (fal.ai/models/fal-ai/nano-banana-2/edit/api, verified 2026-09-19).
 */
describe('parseNanoBananaWebhook', () => {
  it('parses a successful completion', () => {
    const payload = {
      request_id: 'req-nb-1',
      status: 'OK',
      payload: {
        images: [{ url: 'https://fal.media/files/koala/edited.png', content_type: 'image/png' }],
        description: 'Replaced the background with a neutral studio backdrop.',
      },
    };

    const result = parseNanoBananaWebhook(payload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('succeeded');
      expect(result.value.imageUrl).toBe('https://fal.media/files/koala/edited.png');
    }
  });

  it('parses a failed completion', () => {
    const result = parseNanoBananaWebhook({
      request_id: 'req-nb-2',
      status: 'ERROR',
      error: { message: 'content policy violation' },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('failed');
      expect(result.value.error).toBe('content policy violation');
    }
  });
});
