import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/spinner';

export interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean;
}

export function LoadingButton({ loading, disabled, children, ...props }: LoadingButtonProps) {
  return (
    <Button disabled={disabled || loading} {...props}>
      {loading ? <Spinner size={16} /> : children}
    </Button>
  );
}
