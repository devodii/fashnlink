import { UTApi, UTFile } from 'uploadthing/server';
import { env } from '@/lib/env';

// Server-initiated uploads (scraped product images, generated twins/renders —
// section 2/6.6/7). Client-initiated uploads (selfies via UploadDropzone) go
// straight from the browser through the FileRouter in src/lib/uploadthing.ts
// and never touch this file.
const utapi = new UTApi({ token: env.UPLOADTHING_TOKEN });

export type PutResult = { key: string; url: string };

// `key` is OUR logical identifier (e.g. `products/{storeId}/{productId}/{phash}.jpg`,
// section 6.6) — stored as UploadThing's `customId` so later delete/lookup calls
// can keep using it. UploadThing assigns its own opaque internal file key and
// CDN URL on top; the URL is only ever known at upload time, so callers MUST
// persist the returned `url`, not try to derive it later from `key` the way
// R2's public-bucket URLs could be (there is no `getPublicUrl(key)` here).
export async function putObject(key: string, body: Buffer | Uint8Array, contentType: string): Promise<PutResult> {
  const filename = key.split('/').pop() ?? key;
  const file = new UTFile([body as BlobPart], filename, { type: contentType, customId: key });
  const { data, error } = await utapi.uploadFiles(file);
  if (error) throw error;
  return { key, url: data.ufsUrl };
}

export async function deleteObject(key: string): Promise<void> {
  await utapi.deleteFiles(key, { keyType: 'customId' });
}

// Signed, expiring URL (section 9.8: campaign images expire after 30 days).
// Requires the object to have been uploaded with a private ACL.
export async function getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
  const { ufsUrl } = await utapi.getSignedURL(key, { keyType: 'customId', expiresIn: expiresInSeconds });
  return ufsUrl;
}
