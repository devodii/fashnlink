import * as React from 'react';
import { cn } from 'cn';

const SIZE_CLASS = {
  sm: 'max-w-md',
  md: 'max-w-3xl',
  lg: 'max-w-6xl',
  full: 'max-w-none',
} as const;

export interface ContainerProps extends React.ComponentProps<'div'> {
  size?: keyof typeof SIZE_CLASS;
}

/** The only place page widths are defined (section 10.4). `sm` is the
 * shopper-page width (`max-w-md`), `lg` the dashboard width (`max-w-6xl`). */
export function Container({ size = 'lg', className, ...props }: ContainerProps) {
  return <div className={cn('mx-auto w-full px-4', SIZE_CLASS[size], className)} {...props} />;
}
