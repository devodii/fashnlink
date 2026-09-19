import type { Result } from '@/lib/result';

export type JobHandler = (payload: unknown) => Promise<Result<void>>;

/**
 * Generic type -> handler map (section 12, M1 acceptance: "no-op handler
 * registry that currently has zero handlers registered"). Later modules
 * (scraper crawl, render webhook retry, campaign fan-out, ...) register into
 * this from their own index.ts rather than the drain loop knowing about them.
 */
const handlers = new Map<string, JobHandler>();

export function registerJobHandler(type: string, handler: JobHandler): void {
  if (handlers.has(type)) throw new Error(`Job handler already registered for type "${type}"`);
  handlers.set(type, handler);
}

export function getJobHandler(type: string): JobHandler | undefined {
  return handlers.get(type);
}
