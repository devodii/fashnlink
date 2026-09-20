import type { Result } from '@/lib/result';

export type JobHandler = (payload: unknown) => Promise<Result<void>>;

const handlers = new Map<string, JobHandler>();

export function registerJobHandler(type: string, handler: JobHandler): void {
  if (handlers.has(type)) throw new Error(`Job handler already registered for type "${type}"`);
  handlers.set(type, handler);
}

export function getJobHandler(type: string): JobHandler | undefined {
  return handlers.get(type);
}

// ---------------- JOB HANDLER BOUNDARY ----------------
// The only seam between the queue drain loop and business logic. A module
// that owns a job type calls this once at its own definition site; the
// queue drain loop never imports business logic directly.
export function defineJobHandler<T>(
  type: string,
  handler: (payload: T) => Promise<Result<void>>,
): void {
  registerJobHandler(type, handler as JobHandler);
}
