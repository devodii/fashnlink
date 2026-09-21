import * as React from 'react';
import { Pressable, Text, type PressableProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Same variant/size scale as apps/web-app/components/ui/button.tsx so a
 * component built once on web is a known quantity here — the JSX differs
 * (Pressable, not Slot/button), the API doesn't. No native SwiftUI escape
 * hatch (unlike the reference project's Button) — unnecessary for v1.
 */
const buttonVariants = cva('flex-row shrink-0 items-center justify-center gap-2 rounded-md', {
  variants: {
    variant: {
      default: 'bg-primary active:opacity-90',
      destructive: 'bg-destructive active:opacity-90',
      outline: 'border border-input bg-background active:bg-accent',
      secondary: 'bg-secondary active:opacity-80',
      ghost: 'active:bg-accent',
      link: '',
    },
    size: {
      default: 'h-9 px-4',
      xs: 'h-6 px-2',
      sm: 'h-8 px-3',
      lg: 'h-10 px-6',
      icon: 'size-9',
      'icon-xs': 'size-6',
      'icon-sm': 'size-8',
      'icon-lg': 'size-10',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

const buttonTextVariants = cva('text-sm font-medium', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      destructive: 'text-destructive-foreground',
      outline: 'text-foreground',
      secondary: 'text-secondary-foreground',
      ghost: 'text-foreground',
      link: 'text-primary underline',
    },
    size: {
      default: '',
      xs: 'text-xs',
      sm: 'text-sm',
      lg: 'text-base',
      icon: '',
      'icon-xs': '',
      'icon-sm': '',
      'icon-lg': '',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

type ButtonProps = PressableProps &
  VariantProps<typeof buttonVariants> & {
    className?: string;
    textClassName?: string;
  };

function Button({
  className,
  textClassName,
  variant,
  size,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      className={cn(buttonVariants({ variant, size }), disabled && 'opacity-50', className)}
      disabled={disabled}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text className={cn(buttonTextVariants({ variant, size }), textClassName)}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

export { Button, buttonVariants, buttonTextVariants };
export type { ButtonProps };
