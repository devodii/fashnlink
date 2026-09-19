import * as React from 'react';
import { cn } from 'cn';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface PaginationProps {
  pageIndex: number;
  pageCount: number;
  onPageChange: (pageIndex: number) => void;
  className?: string;
}

/** Section 10.4: controlled, compact on mobile — a numbered variant on
 * `DataTable`'s own Previous/Next footer for cases that want page numbers
 * (e.g. a public catalog browse). */
export function Pagination({ pageIndex, pageCount, onPageChange, className }: PaginationProps) {
  const pages = Array.from({ length: pageCount }, (_, i) => i).filter(
    (p) => p === 0 || p === pageCount - 1 || Math.abs(p - pageIndex) <= 1
  );

  return (
    <div className={cn('flex items-center justify-center gap-1', className)}>
      <Button variant="outline" size="icon" className="size-8" onClick={() => onPageChange(pageIndex - 1)} disabled={pageIndex <= 0}>
        <ChevronLeft className="size-4" />
      </Button>
      <div className="hidden items-center gap-1 sm:flex">
        {pages.map((p, i) => (
          <React.Fragment key={p}>
            {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-muted-foreground">…</span>}
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
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
