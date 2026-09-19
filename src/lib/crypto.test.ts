import { describe, expect, it } from 'vitest';
import { decrypt, encrypt } from './crypto';

/**
 * Real AES-256-GCM round trip against the real ENCRYPTION_KEY in .env.local
 * ; no mocking needed, this is pure local crypto with no external service.
 */
describe('crypto encrypt/decrypt', () => {
  it('round-trips a plaintext string', () => {
    const plaintext = 'sk_live_klaviyo_abc123';
    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it('produces a different ciphertext each time (random iv)', () => {
    const a = encrypt('same-plaintext');
    const b = encrypt('same-plaintext');
    expect(a).not.toBe(b);
  });

  it('rejects a tampered ciphertext', () => {
    const ciphertext = encrypt('sensitive-api-key');
    const [iv, tag, body] = ciphertext.split('.');
    const tampered = [iv, tag, body.slice(0, -2) + 'zz'].join('.');
    expect(() => decrypt(tampered)).toThrow();
  });
});
