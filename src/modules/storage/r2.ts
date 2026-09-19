import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/lib/env';

// Cloudflare R2 is S3-compatible (section 2): one client, R2's account-scoped
// endpoint. Every image in the app (product photos, selfies, twins, renders,
// share cards) goes through this client — nothing talks to R2 directly.
const client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export async function putObject(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void> {
  await client.send(
    new PutObjectCommand({ Bucket: env.R2_BUCKET, Key: key, Body: body, ContentType: contentType })
  );
}

export async function deleteObject(key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
}

export function getPublicUrl(key: string): string {
  return `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`;
}

// Used for signed, expiring URLs (section 9.8: campaign images expire after
// 30 days) and for direct browser uploads that skip our server.
export async function presignGetUrl(key: string, expiresInSeconds: number): Promise<string> {
  return getSignedUrl(client, new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }), {
    expiresIn: expiresInSeconds,
  });
}

export async function presignPutUrl(key: string, contentType: string, expiresInSeconds = 300): Promise<string> {
  return getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: env.R2_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: expiresInSeconds }
  );
}
