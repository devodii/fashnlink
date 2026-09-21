import type { Logger } from '@/lib/log';
import type { Result } from '@/lib/result';

export interface Adapter<TInput, TOutput, TKey extends string = string> {
  readonly key: TKey;
  canHandle(input: TInput): Promise<boolean> | boolean;
  run(input: TInput, ctx: Ctx): Promise<Result<TOutput>>;
}

export type Ctx = {
  log: Logger;
  requestId: string;
  deadlineMs: number;
  fetch: typeof fetch;
};

export class AdapterRegistry<TInput, TOutput, TKey extends string = string> {
  constructor(protected adapters: Adapter<TInput, TOutput, TKey>[]) {}

  async resolve(input: TInput): Promise<Adapter<TInput, TOutput, TKey> | null> {
    for (const adapter of this.adapters) {
      if (await adapter.canHandle(input)) return adapter;
    }
    return null;
  }

  get(key: TKey): Adapter<TInput, TOutput, TKey> | undefined {
    return this.adapters.find((adapter) => adapter.key === key);
  }

  list(): readonly Adapter<TInput, TOutput, TKey>[] {
    return this.adapters;
  }
}
