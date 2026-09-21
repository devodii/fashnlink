import * as AvatarPrimitive from '@rn-primitives/avatar';
import { cn } from '@/lib/utils';

function Avatar({ className, ...props }: AvatarPrimitive.RootProps) {
  return (
    <AvatarPrimitive.Root
      className={cn('h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }: AvatarPrimitive.ImageProps) {
  return <AvatarPrimitive.Image className={cn('h-full w-full', className)} {...props} />;
}

function AvatarFallback({ className, ...props }: AvatarPrimitive.FallbackProps) {
  return (
    <AvatarPrimitive.Fallback
      className={cn('h-full w-full items-center justify-center bg-muted', className)}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
