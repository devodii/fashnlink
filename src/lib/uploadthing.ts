import { createUploadthing, type FileRouter } from 'uploadthing/next';

const f = createUploadthing();

// DECISION: storage backend switched from Cloudflare R2 to UploadThing mid-build.
// UploadThing's FileRouter is itself the "one file, one registry entry" adapter
// pattern the rest of the codebase uses (section 4) — a new upload surface is a
// new key on this object, not a new abstraction. `imageUploader` is the one
// generic endpoint needed so far (M1.5's UploadDropzone demo). Feature-specific
// endpoints with real auth/consent middleware (selfie uploads needing the
// shopper session from M4, logo/manual-product uploads needing the merchant
// session from M5) get added here — as additional keys — when those milestones
// build the flows that need them, not before.
export const uploadRouter = {
  imageUploader: f({ image: { maxFileSize: '8MB', maxFileCount: 1 } })
    .middleware(async () => ({}))
    .onUploadComplete(async ({ file }) => ({ key: file.key, url: file.ufsUrl })),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
