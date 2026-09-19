import * as React from 'react';
import { cn } from 'cn';
import { Progress } from '@/components/ui/progress';

export interface CreditMeterProps {
  balance: number;
  reserved?: number;
  cap?: number;
  variant?: 'compact' | 'full';
  className?: string;
}

/** merchant render-credit balance; `reserved` covers a
 * pending campaign not yet settled against `balance`. */
export function CreditMeter({
  balance,
  reserved = 0,
  cap,
  variant = 'full',
  className,
}: CreditMeterProps) {
  if (variant === 'compact') {
    return (
      <span className={cn('text-sm font-medium text-foreground', className)}>
        {balance.toLocaleString()} credits
        {reserved > 0 && (
          <span className="text-muted-foreground"> ({reserved.toLocaleString()} reserved)</span>
        )}
      </span>
    );
  }

  const pct = cap ? Math.min(100, (balance / cap) * 100) : undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-foreground">{balance.toLocaleString()} credits</p>
        {cap !== undefined && (
          <p className="text-xs text-muted-foreground">of {cap.toLocaleString()}</p>
        )}
      </div>
      {pct !== undefined && <Progress value={pct} />}
      {reserved > 0 && (
        <p className="text-xs text-muted-foreground">
          {reserved.toLocaleString()} reserved for pending campaigns
        </p>
      )}
    </div>
  );
}
