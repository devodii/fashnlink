import { describe, expect, it } from 'vitest';
import { fashnProvider } from './fashn';

// Realistic payloads matching fal's documented webhook shape
// (fal.ai/docs/model-endpoints/queue) and FASHN v1.6's own response schema
// (fal.ai/models/fal-ai/fashn/tryon/v1.6/api), both verified 2026-09-19.
describe('fashnProvider.parseWebhook', () => {
  it('parses a successful completion', () => {
    const payload = {
      request_id: 'req-abc-123',
      gateway_request_id: 'req-abc-123',
      status: 'OK',
      payload: {
        images: [
          {
            url: 'https://fal.media/files/tiger/abc123.png',
            content_type: 'image/png',
            file_name: 'abc123.png',
            file_size: 512000,
          },
        ],
      },
    };

    const result = fashnProvider.parseWebhook(payload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('succeeded');
      expect(result.value.providerJobId).toBe('req-abc-123');
      expect(result.value.imageUrl).toBe('https://fal.media/files/tiger/abc123.png');
    }
  });

  it('parses a failed completion', () => {
    const payload = {
      request_id: 'req-def-456',
      status: 'ERROR',
      error: { message: 'model image did not contain a detectable person' },
    };

    const result = fashnProvider.parseWebhook(payload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('failed');
      expect(result.value.error).toContain('detectable person');
    }
  });

  it('rejects a malformed envelope', () => {
    const result = fashnProvider.parseWebhook({ not: 'a fal payload' });
    expect(result.ok).toBe(false);
  });

  it('rejects an OK envelope with an unrecognized payload shape', () => {
    const result = fashnProvider.parseWebhook({
      request_id: 'req-1',
      status: 'OK',
      payload: { unexpected: true },
    });
    expect(result.ok).toBe(false);
  });
});
