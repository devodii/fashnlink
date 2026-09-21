import pino from 'pino';

/**
 * pino's worker-thread `transport` option (pino-pretty) is unreliable under
 * Next.js's webpack bundling, since the worker script path does not resolve
 * the same way in dev as in the built output. Plain JSON logging works
 * identically in both, so it is the default here.
 */
export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

export type Logger = pino.Logger;

export function childLogger(requestId: string, bindings: Record<string, unknown> = {}): Logger {
  return logger.child({ requestId, ...bindings });
}
