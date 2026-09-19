import { createRouteHandler } from 'uploadthing/next';
import { uploadRouter } from '@/lib/uploadthing';

// DECISION: the uploadthing SDK reads UPLOADTHING_TOKEN from process.env
// internally (its own framework contract, not our code) — section 14's "no
// process.env outside env.ts" governs our code, not a third-party SDK's
// runtime. `env.ts` still validates the var is present so boot fails fast if
// it's missing, before any request ever reaches this route.
export const { GET, POST } = createRouteHandler({ router: uploadRouter });
