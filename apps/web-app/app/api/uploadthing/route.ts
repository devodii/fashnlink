import { createRouteHandler } from 'uploadthing/next';
import { uploadRouter } from '@/lib/uploadthing';

/**
 * The uploadthing SDK reads `UPLOADTHING_TOKEN` from `process.env`
 * internally, its own framework contract, not something this route can pass
 * in. `env.ts` still validates the var is present so boot fails fast if it's
 * missing, before any request reaches this route.
 */
export const { GET, POST } = createRouteHandler({ router: uploadRouter });
