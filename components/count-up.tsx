import { NumberTicker } from '@/components/motion/number-ticker';

export interface CountUpProps {
  value: number;
  formatter?: (value: number) => string;
  className?: string;
}

export function CountUp({ value, formatter, className }: CountUpProps) {
  return <NumberTicker value={value} formatter={formatter} className={className} />;
}
