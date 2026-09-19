import * as React from 'react';
import { cn } from 'cn';
import { Skeleton } from '@/components/ui/skeleton';

export interface MediaTileProps {
  src: string;
  alt: string;
  aspect?: '3/4' | '1/1' | '9/16';
  overlay?: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  className?: string;
}

const ASPECT_CLASS = {
  '3/4': 'aspect-[3/4]',
  '1/1': 'aspect-square',
  '9/16': 'aspect-[9/16]',
} as const;

/** products, renders, closet, model pack all use this one
 * tile. */
export function MediaTile({
  src,
  alt,
  aspect = '3/4',
  overlay,
  onClick,
  loading,
  className,
}: MediaTileProps) {
  if (loading) {
    return <Skeleton className={cn('rounded-md', ASPECT_CLASS[aspect], className)} />;
  }

  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-md bg-muted',
        ASPECT_CLASS[aspect],
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="size-full object-cover" />
      {overlay && <div className="absolute inset-0">{overlay}</div>}
    </Comp>
  );
}
