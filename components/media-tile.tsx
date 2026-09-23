import * as React from 'react';
import { cn } from 'cn';
import { Skeleton } from '@/components/ui/skeleton';

export interface MediaTileProps {
  src: string;
  alt: string;
  aspect?: '3/4' | '1/1' | '9/16' | '4/5';
  overlay?: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  /** Native `<img loading>` hint; defaults to 'lazy' since most tiles are below the fold or decorative. */
  imageLoading?: 'lazy' | 'eager';
  className?: string;
}

const ASPECT_CLASS = {
  '3/4': 'aspect-[3/4]',
  '1/1': 'aspect-square',
  '9/16': 'aspect-[9/16]',
  '4/5': 'aspect-[4/5]',
} as const;

export function MediaTile({
  src,
  alt,
  aspect = '3/4',
  overlay,
  onClick,
  loading,
  imageLoading = 'lazy',
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
      <img
        src={src}
        alt={alt}
        loading={imageLoading}
        decoding="async"
        className="size-full object-cover"
      />
      {overlay && <div className="absolute inset-0">{overlay}</div>}
    </Comp>
  );
}
