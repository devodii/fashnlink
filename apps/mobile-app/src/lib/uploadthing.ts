import { generateReactNativeHelpers } from '@uploadthing/expo';
import type { UploadRouter } from '../../../web-app/lib/uploadthing';
import { API_URL } from '@/lib/config';

/**
 * `import type` only, erased at compile time — the same UploadThing
 * `imageUploader` route web-app/lib/uploadthing.ts defines and serves at
 * `/api/uploadthing`, not a duplicated router. No `uploadthing/next` runtime
 * code ever ships in the mobile bundle, just this route's shape.
 */
export const { useImageUploader } = generateReactNativeHelpers<UploadRouter>({
  url: `${API_URL}/api/uploadthing`,
});
