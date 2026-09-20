import { UTApi, UTFile } from 'uploadthing/server';
import { env } from '@/lib/env';

// Client-initiated uploads (selfies via UploadDropzone) go straight from the
// browser through the FileRouter in src/lib/uploadthing.ts and never touch
// this file, which is for server-initiated uploads only.
const utapi = new UTApi({ token: env.UPLOADTHING_TOKEN });

export type PutResult = { key: string; url: string };

/**
 * UploadThing assigns its own opaque internal file key and CDN URL; the URL
 * is only known at upload time, so callers must persist the returned `url`
 * rather than deriving it later from `key`. There is no `getPublicUrl(key)`.
 * `key` is stored as UploadThing's `customId` so delete/lookup calls can
 * still address the object by our own logical key.
 */
export async function putObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<PutResult> {
  const filename = key.split('/').pop() ?? key;
  const file = new UTFile([body as BlobPart], filename, { type: contentType, customId: key });
  const { data, error } = await utapi.uploadFiles(file);
  if (error) throw error;
  return { key, url: data.ufsUrl };
}

export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await utapi.deleteFiles(keys, { keyType: 'customId' });
}

// Requires the object to have been uploaded with a private ACL.
export async function getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
  const { ufsUrl } = await utapi.getSignedURL(key, {
    keyType: 'customId',
    expiresIn: expiresInSeconds,
  });
  return ufsUrl;
}
