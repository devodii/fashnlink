import OpenAI from 'openai';
import { env } from '@/lib/env';

/**
 * One client, shared by every OpenAI-backed call in the app (section 2:
 * classification + moderation); nothing else constructs its own.
 */
export const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
