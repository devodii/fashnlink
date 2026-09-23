import { describe, expect, it } from 'vitest';
import { bodySchema } from './schema';

describe('POST /api/track body validation', () => {
  it('accepts a well-formed batch', () => {
    const result = bodySchema.safeParse({
      token: 'abc123',
      paths: [
        { path: '/products/x', linkText: 'Buy now' },
        { path: '/about', linkText: null },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing token', () => {
    expect(bodySchema.safeParse({ paths: [{ path: '/x', linkText: null }] }).success).toBe(false);
  });

  it('rejects an empty paths array', () => {
    expect(bodySchema.safeParse({ token: 'abc', paths: [] }).success).toBe(false);
  });

  it('rejects a path that is not relative', () => {
    const result = bodySchema.safeParse({
      token: 'abc',
      paths: [{ path: 'https://evil.example.com/x', linkText: null }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown top-level fields', () => {
    const result = bodySchema.safeParse({
      token: 'abc',
      paths: [{ path: '/x', linkText: null }],
      cookies: ['nope'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields inside a path entry', () => {
    const result = bodySchema.safeParse({
      token: 'abc',
      paths: [{ path: '/x', linkText: null, visitorId: 'evil' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects more paths than the per-request cap', () => {
    const result = bodySchema.safeParse({
      token: 'abc',
      paths: Array.from({ length: 101 }, (_, i) => ({ path: `/p/${i}`, linkText: null })),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-string linkText', () => {
    const result = bodySchema.safeParse({
      token: 'abc',
      paths: [{ path: '/x', linkText: 123 }],
    });
    expect(result.success).toBe(false);
  });
});
