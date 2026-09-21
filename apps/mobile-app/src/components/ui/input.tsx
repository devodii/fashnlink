import * as React from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<TextInput, TextInputProps>(
  ({ className, placeholderTextColor, ...props }, ref) => (
    <TextInput
      ref={ref}
      placeholderTextColor={placeholderTextColor ?? '#94A3B8'}
      className={cn(
        'h-9 rounded-md border border-input bg-background px-3 text-base text-foreground',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
