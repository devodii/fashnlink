import { cn } from 'cn';
import { HeroDemoLoop } from '@/components/hero-demo-loop';

export interface AuthShowcasePanelProps {
  className?: string;
}

export function AuthShowcasePanel({ className }: AuthShowcasePanelProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-6 rounded-2xl bg-secondary p-10',
        className,
      )}
    >
      <HeroDemoLoop className="max-w-64 border-0 shadow-sm" />
      <p className="max-w-xs text-center text-sm text-muted-foreground">
        Send a link. They see themselves wearing it in seconds.
      </p>
    </div>
  );
}
