import * as RHF from 'react-hook-form';

/** every field component takes this shared shape plus its own
 * input-specific props. */
export type FieldProps<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>> = {
  control: RHF.Control<TValues>;
  name: TName;
  label: string;
  description?: string;
  className?: string;
};
