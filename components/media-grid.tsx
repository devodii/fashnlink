import * as React from 'react';
import { cn } from 'cn';
import { MediaTile, type MediaTileProps } from '@/components/media-tile';

export interface MediaGridProps {
  items: MediaTileProps[];
  columns?: { base?: number; md?: number };
  emptyState?: React.ReactNode;
  className?: string;
}

const BASE_COLS: Record<number, string> = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' };
const MD_COLS: Record<number, string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
};

/** responsive grid of `MediaTile`. */
export function MediaGrid({
  items,
  columns = { base: 2, md: 4 },
  emptyState,
  className,
}: MediaGridProps) {
  if (items.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <div
      className={cn(
        'grid gap-3',
        BASE_COLS[columns.base ?? 2],
        MD_COLS[columns.md ?? 4],
        className,
      )}
    >
      {items.map((item, i) => (
        <MediaTile key={i} {...item} />
      ))}
    </div>
  );
}
