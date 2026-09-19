import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '@/lib/env';

// Section 9.8: merchant ESP API keys are "encrypted at rest ... AES-256-GCM".
// `ENCRYPTION_KEY` is 32 raw bytes, base64-encoded in env (see .env.example).
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit nonce, the standard/recommended size for GCM

function key(): Buffer {
  // ENCRYPTION_KEY is prod-required but only dev-optional (section 3) — this
  // is the one place that matters, since encrypt/decrypt are the only
  // callers and both need a real key to do anything meaningful.
  if (!env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not set — cannot encrypt/decrypt ESP credentials');
  }
  return Buffer.from(env.ENCRYPTION_KEY, 'base64');
}

// Output is `${iv}.${authTag}.${ciphertext}`, each base64url — one string a
// text column can hold, self-contained (no separate iv/tag storage needed).
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString('base64url')).join('.');
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, ciphertextB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !ciphertextB64) {
    throw new Error('malformed encrypted payload');
  }
  const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(ivB64, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, 'base64url')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}
