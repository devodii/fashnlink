import pino from 'pino';

// Structured logger (section 11): every log line carries a requestId. No
// console.log anywhere else in the codebase.
//
// DECISION: pino's worker-thread `transport` option (pino-pretty) is unreliable
// under Next.js's webpack bundling (the worker script path doesn't resolve the
// same way in dev vs. the built output). Plain JSON logging works identically
// in both, on the client-less server runtime, and on Vercel, so it's the
// default here rather than a transport that can silently stop working.
export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

export type Logger = pino.Logger;

export function childLogger(requestId: string, bindings: Record<string, unknown> = {}): Logger {
  return logger.child({ requestId, ...bindings });
}
