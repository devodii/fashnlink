import * as React from 'react';
import { cn } from 'cn';

export interface MarqueeProps {
  children: React.ReactNode;
  vertical?: boolean;
  reverse?: boolean;
  durationSeconds?: number;
  className?: string;
  fade?: boolean;
}

const FADE_Y = 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)';
const FADE_X = 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)';

export function Marquee({
  children,
  vertical = false,
  reverse = false,
  durationSeconds = 40,
  className,
  fade = true,
}: MarqueeProps) {
  const mask = fade ? (vertical ? FADE_Y : FADE_X) : undefined;

  return (
    <div
      className={cn('group relative overflow-hidden', className)}
      style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
    >
      <div
        className={cn('flex motion-reduce:animate-none', vertical ? 'flex-col' : 'flex-row')}
        style={{
          animation: `${vertical ? 'marquee-y' : 'marquee-x'} ${durationSeconds}s linear infinite`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        <div className={cn('flex shrink-0 gap-4', vertical ? 'flex-col' : 'flex-row')}>
          {children}
        </div>
        <div className={cn('flex shrink-0 gap-4', vertical ? 'flex-col' : 'flex-row')} aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
