import { describe, expect, it } from 'vitest';
import { klingProvider } from './kling';

// Payload shape matches Kling Kolors v1.5's documented response
// (fal.ai/models/fal-ai/kling/v1-5/kolors-virtual-try-on/api, verified
// 2026-09-19 — note fal's own docs flag this exact endpoint as deprecated,
// see the DECISION comment in src/config/models.ts).
describe('klingProvider.parseWebhook', () => {
  it('parses a successful completion', () => {
    const payload = {
      request_id: 'req-kling-1',
      status: 'OK',
      payload: {
        image: { url: 'https://fal.media/files/panda/xyz.png', content_type: 'image/png' },
      },
    };

    const result = klingProvider.parseWebhook(payload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('succeeded');
      expect(result.value.imageUrl).toBe('https://fal.media/files/panda/xyz.png');
    }
  });

  it('parses a failed completion with a string error', () => {
    const payload = { request_id: 'req-kling-2', status: 'ERROR', error: 'internal server error' };
    const result = klingProvider.parseWebhook(payload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('failed');
      expect(result.value.error).toBe('internal server error');
    }
  });
});
