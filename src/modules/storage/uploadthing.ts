import { UTApi, UTFile } from 'uploadthing/server';
import { env } from '@/lib/env';

const utapi = new UTApi({ token: env.UPLOADTHING_TOKEN });

export type PutResult = { key: string; url: string };

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

export async function getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
  const { ufsUrl } = await utapi.getSignedURL(key, {
    keyType: 'customId',
    expiresIn: expiresInSeconds,
  });
  return ufsUrl;
}
