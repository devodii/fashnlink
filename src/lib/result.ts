export type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export type AppError = {
  code:
    | 'NOT_FOUND'
    | 'UNSUPPORTED_PLATFORM'
    | 'SCRAPE_FAILED'
    | 'MODERATION_BLOCKED'
    | 'RENDER_FAILED'
    | 'INSUFFICIENT_CREDITS'
    | 'RATE_LIMITED'
    | 'INVALID_INPUT'
    | 'INTERNAL'
    // DECISION: added for src/lib/api-handler.ts, which needs distinct codes for
    // auth failures and idempotency-key conflicts — the original M1 union
    // predates API routes having auth/idempotency at all.
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'CONFLICT';
  message: string;
  cause?: unknown;
  meta?: Record<string, unknown>;
};
