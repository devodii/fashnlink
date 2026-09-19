import { createTypeSafeAi } from '@ai-sdk/typesafe-ai';
import { env } from '@/lib/env';

export const typesafeAi = createTypeSafeAi({ apiKey: env.TYPESAFE_AI_API_KEY });
