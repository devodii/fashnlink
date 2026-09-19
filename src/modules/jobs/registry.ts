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
