import * as ProgressPrimitive from '@rn-primitives/progress';
import { View } from 'react-native';
import { cn } from '@/lib/utils';

function Progress({ className, value, ...props }: ProgressPrimitive.RootProps) {
  return (
    <ProgressPrimitive.Root
      value={value}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator asChild>
        <View className="h-full bg-primary" style={{ width: `${value ?? 0}%` }} />
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
