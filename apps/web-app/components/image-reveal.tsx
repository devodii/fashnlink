import * as React from 'react';
import { cn } from 'cn';
import { Reveal } from '@/components/motion/reveal';

export interface ImageRevealProps {
  from: string;
  to: string | null;
  alt: string;
  aspect?: '3/4' | '1/1' | '9/16';
  className?: string;
}

export function ImageReveal({ from, to, alt, aspect = '3/4', className }: ImageRevealProps) {
  return (
    <Reveal
      revealed={!!to}
      className={cn(
        'rounded-md bg-muted',
        aspect === '3/4' && 'aspect-3/4',
        aspect === '1/1' && 'aspect-square',
        aspect === '9/16' && 'aspect-9/16',
        className,
      )}
      from={
        // eslint-disable-next-line @next/next/no-img-element
        <img src={from} alt={alt} className="size-full object-cover" />
      }
      to={
        to ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={to} alt={alt} className="size-full object-cover" />
        ) : null
      }
    />
  );
}
