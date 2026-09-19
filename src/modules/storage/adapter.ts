import type { Adapter, Ctx } from '@/lib/adapter';
import { err, ok, type Result } from '@/lib/result';
import * as uploadthing from './uploadthing';

export type StorageInput =
  | { op: 'put'; key: string; body: Buffer | Uint8Array; contentType: string }
  | { op: 'delete'; key: string }
  | { op: 'getSignedUrl'; key: string; expiresInSeconds: number };

export type StorageOutput = { key: string; url: string | null };

export type StorageKey = 'uploadthing';

/**
 * One backend today (uploadthing), registered as an Adapter (section 4:
 * "storage backends are Adapter<...> implementations behind an
 * AdapterRegistry") so adding a second provider later is one more file plus a
 * registry entry, not a second abstraction.
 */
export const uploadthingAdapter: Adapter<StorageInput, StorageOutput, StorageKey> = {
  key: 'uploadthing',
  canHandle: () => true,
  async run(input, ctx: Ctx): Promise<Result<StorageOutput>> {
    try {
      switch (input.op) {
        case 'put': {
          const result = await uploadthing.putObject(input.key, input.body, input.contentType);
          return ok(result);
        }
        case 'delete':
          await uploadthing.deleteObject(input.key);
          return ok({ key: input.key, url: null });
        case 'getSignedUrl': {
          const url = await uploadthing.getSignedUrl(input.key, input.expiresInSeconds);
          return ok({ key: input.key, url });
        }
      }
    } catch (cause) {
      ctx.log.error({ cause, input }, 'storage adapter failed');
      return err({ code: 'INTERNAL', message: 'Storage operation failed', cause });
    }
  },
};
