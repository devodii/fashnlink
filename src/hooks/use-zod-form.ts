import { zodResolver } from '@hookform/resolvers/zod';
import * as RHF from 'react-hook-form';
import type { z } from 'zod';

/** every form is a zod schema shared with the server action that
 * consumes it, resolved once here instead of re-declaring validation client
 * and server side.
 *
 * DECISION: `zodResolver`'s zod-v4 overload infers its `Input`/`Output`
 * generics from the schema's internal `_zod` shape, which TypeScript can't
 * resolve through an opaque generic type parameter; a known friction point
 * between @hookform/resolvers 5.x and zod 4.x. The cast below is a single,
 * structurally-related `as` (Resolver<FieldValues> -> Resolver<TFieldValues>),
 * not `as unknown as`, and is scoped to this one call site.
 */
export function useZodForm<TFieldValues extends RHF.FieldValues>(
  schema: z.ZodType<TFieldValues, TFieldValues>,
  options?: Omit<RHF.UseFormProps<TFieldValues>, 'resolver'>,
) {
  return RHF.useForm<TFieldValues>({
    ...options,
    resolver: zodResolver(schema) as RHF.Resolver<TFieldValues>,
  });
}
