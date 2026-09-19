import { createTypeSafeAi } from '@ai-sdk/typesafe-ai';
import { env } from '@/lib/env';

/**
 * One client, shared by every Jev-backed evaluation in the app. Talks
 * directly to api.typesafe.ai (createTypeSafeAi's default baseURL); NOT
 * routed through Vercel AI Gateway, so this needs no AI_GATEWAY_API_KEY/OIDC
 * setup, just TypeSafe's own key.
 */
export const typesafeAi = createTypeSafeAi({ apiKey: env.TYPESAFE_AI_API_KEY });
