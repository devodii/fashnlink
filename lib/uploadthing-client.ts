import { generateReactHelpers } from '@uploadthing/react';
import type { UploadRouter } from '@/lib/uploadthing';

// UploadThing uploads go straight from the browser to storage, never
// through our server, so there is no presigned-URL step to build here.
export const { useUploadThing, uploadFiles } = generateReactHelpers<UploadRouter>();
