import { zodResolver } from '@hookform/resolvers/zod';
import * as RHF from 'react-hook-form';
import type { z } from 'zod';

/** Section 10.5: every form is a zod schema shared with the server action that
 * consumes it, resolved once here instead of re-declaring validation client
 * and server side. */
export function useZodForm<TSchema extends z.ZodType>(
  schema: TSchema,
  options?: Omit<RHF.UseFormProps<z.infer<TSchema>>, 'resolver'>
) {
  return RHF.useForm<z.infer<TSchema>>({
    ...options,
    resolver: zodResolver(schema),
  });
}
