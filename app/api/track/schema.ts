import { z } from 'zod';
import { TRACK_INGEST_MAX_PATHS_PER_REQUEST } from '@/constants';

export const bodySchema = z
  .object({
    token: z.string().min(1).max(200),
    paths: z
      .array(
        z
          .object({
            path: z
              .string()
              .min(1)
              .max(500)
              .refine((p) => p.startsWith('/'), 'path must be relative and start with /'),
            linkText: z.string().max(300).nullable(),
          })
          .strict(),
      )
      .min(1)
      .max(TRACK_INGEST_MAX_PATHS_PER_REQUEST),
  })
  .strict();
