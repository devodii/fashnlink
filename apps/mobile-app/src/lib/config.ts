export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

/** Public web-app origin used for shareable links (e.g. /r/[renderId]); same as API_URL in dev. */
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? API_URL;
