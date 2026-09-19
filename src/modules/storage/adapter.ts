import type { Adapter, Ctx } from '@/lib/adapter';
import { err, ok, type Result } from '@/lib/result';
import * as r2 from './r2';

export type StorageInput =
  | { op: 'put'; key: string; body: Buffer | Uint8Array; contentType: string }
  | { op: 'delete'; key: string }
  | { op: 'presignPut'; key: string; contentType: string; expiresInSeconds?: number };

export type StorageOutput = { key: string; url: string | null };

export type StorageKey = 'r2';

// One backend today (r2), registered as an Adapter (section 4: "storage
// backends are Adapter<...> implementations behind an AdapterRegistry") so
// adding a second provider later is one more file plus a registry entry,
// not a second abstraction.
export const r2Adapter: Adapter<StorageInput, StorageOutput, StorageKey> = {
  key: 'r2',
  canHandle: () => true,
  async run(input, ctx: Ctx): Promise<Result<StorageOutput>> {
    try {
      switch (input.op) {
        case 'put':
          await r2.putObject(input.key, input.body, input.contentType);
          return ok({ key: input.key, url: r2.getPublicUrl(input.key) });
        case 'delete':
          await r2.deleteObject(input.key);
          return ok({ key: input.key, url: null });
        case 'presignPut': {
          const url = await r2.presignPutUrl(input.key, input.contentType, input.expiresInSeconds);
          return ok({ key: input.key, url });
        }
      }
    } catch (cause) {
      ctx.log.error({ cause, input }, 'storage adapter failed');
      return err({ code: 'INTERNAL', message: 'Storage operation failed', cause });
    }
  },
};
