import * as CheckboxPrimitive from '@rn-primitives/checkbox';
import { Check } from 'lucide-react-native';
import { cn } from '@/lib/utils';

function Checkbox({ className, checked, ...props }: CheckboxPrimitive.RootProps) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      className={cn(
        'h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary',
        checked && 'bg-primary',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check size={12} color="white" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
