import { generateReactHelpers } from '@uploadthing/react';
import type { UploadRouter } from '@/lib/uploadthing';

// Typed client hook + one-off helper, bound to our FileRouter. Client-side
// upload components (UploadDropzone, section 10.4) use `useUploadThing` —
// UploadThing uploads go straight from the browser to storage, they never
// pass through our server, so there is no presigned-URL step to build here.
export const { useUploadThing, uploadFiles } = generateReactHelpers<UploadRouter>();
