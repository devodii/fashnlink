import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/actions/auth';

export const { GET, POST } = toNextJsHandler(auth);
