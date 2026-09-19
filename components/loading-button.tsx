import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean;
}

/** Section 10.4: a `Button` that keeps its width while `loading` swaps its
 * content for a spinner, instead of the label disappearing mid-click. */
export function LoadingButton({ loading, disabled, children, ...props }: LoadingButtonProps) {
  return (
    <Button disabled={disabled || loading} {...props}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : children}
    </Button>
  );
}
