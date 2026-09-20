import * as React from 'react';
import { cn } from 'cn';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react/ssr';
import { Button } from '@/components/ui/button';

export interface PaginationProps {
  pageIndex: number;
  pageCount: number;
  onPageChange: (pageIndex: number) => void;
  className?: string;
}

export function Pagination({ pageIndex, pageCount, onPageChange, className }: PaginationProps) {
  const pages = Array.from({ length: pageCount }, (_, i) => i).filter(
    (p) => p === 0 || p === pageCount - 1 || Math.abs(p - pageIndex) <= 1,
  );

  return (
    <div className={cn('flex items-center justify-center gap-1', className)}>
      <Button
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => onPageChange(pageIndex - 1)}
        disabled={pageIndex <= 0}
      >
        <CaretLeftIcon className="size-4" />
      </Button>
      <div className="hidden items-center gap-1 sm:flex">
        {pages.map((p, i) => (
          <React.Fragment key={p}>
            {i > 0 && pages[i - 1] !== p - 1 && (
              <span className="px-1 text-muted-foreground">…</span>
            )}
            <Button
              variant={p === pageIndex ? 'secondary' : 'ghost'}
              size="icon"
              className="size-8 text-xs"
              onClick={() => onPageChange(p)}
            >
              {p + 1}
            </Button>
          </React.Fragment>
        ))}
      </div>
      <span className="text-xs text-muted-foreground sm:hidden">
        {pageIndex + 1} / {pageCount}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => onPageChange(pageIndex + 1)}
        disabled={pageIndex >= pageCount - 1}
      >
        <CaretRightIcon className="size-4" />
      </Button>
    </div>
  );
}
