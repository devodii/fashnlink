'use client';

import * as React from 'react';
import { cn } from 'cn';
import {
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { type MixinProps, splitProps } from '@/lib/mixin';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface DataTableAction<TData> {
  label: string;
  onClick: (row: TData) => void;
  variant?: 'default' | 'destructive';
  when?: (row: TData) => boolean;
}

export interface DataTablePagination {
  pageIndex: number;
  pageSize: number;
  pageCount?: number; // server mode: total pages, unknown -> `hasNextPage` drives the Next button instead
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  onPageChange: (pageIndex: number) => void;
}

const STICKY_ACTIONS_CLASS = 'sticky right-0 bg-card shadow-[-1px_0_0_0_var(--border)]';

interface DataTableProps<TData, TValue>
  extends
    MixinProps<'row', React.ComponentProps<typeof TableRow>>,
    MixinProps<'checkbox', React.ComponentProps<typeof Checkbox>>,
    MixinProps<'body', React.ComponentProps<typeof TableBody>>,
    MixinProps<'cell', React.ComponentProps<typeof TableCell>>,
    MixinProps<'container', React.ComponentProps<'div'>> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getRowId?: (row: TData) => string;
  sorting?: { state: SortingState; onChange: (state: SortingState) => void };
  pagination?: DataTablePagination;
  rowActions?: (row: TData) => DataTableAction<TData>[];
  selectable?: boolean;
  onSelectionChange?: (rows: TData[]) => void;
  onRowClick?: (row: TData) => void;
  emptyState: React.ReactNode;
  loading?: boolean;
  skeletonRowCount?: number;
  toolbar?: React.ReactNode;
  /** Section 10.8: under `md`, rows render as this instead of a
   * horizontally-scrolling table. */
  mobileCard?: (row: TData) => React.ReactNode;
  className?: string;
}

// DECISION: section 10.4 lists `sorting?` without specifying controlled vs.
// uncontrolled. Mirrored on `pagination`'s documented "client or server"
// duality: omitted -> internal state (client-sorted); passed -> the caller
// owns sorting state (server-sorted), matching how `pagination` already
// works below.
export function DataTable<TData, TValue>({
  columns,
  data,
  getRowId,
  sorting,
  pagination,
  rowActions,
  selectable,
  onSelectionChange,
  onRowClick,
  emptyState,
  loading,
  skeletonRowCount = 5,
  toolbar,
  mobileCard,
  className,
  ...mixinProps
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const { row, checkbox, body, cell, container } = splitProps(
    mixinProps,
    'row',
    'checkbox',
    'body',
    'cell',
    'container',
  );

  const tableColumns = React.useMemo(() => {
    const cols = [...columns];

    if (selectable) {
      cols.unshift({
        id: 'select',
        size: 40,
        header: ({ table }) => (
          <Checkbox
            {...checkbox}
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          />
        ),
        cell: ({ row: r }) => (
          <Checkbox
            {...checkbox}
            checked={r.getIsSelected()}
            onCheckedChange={(value) => r.toggleSelected(!!value)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      });
    }

    if (rowActions) {
      cols.push({
        id: 'actions',
        size: 50,
        header: () => null,
        cell: ({ row: r }) => {
          const actions = rowActions(r.original).filter((a) => !a.when || a.when(r.original));
          if (actions.length === 0) return null;
          return (
            <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {actions.map((action, i) => (
                    <DropdownMenuItem
                      key={i}
                      onClick={() => action.onClick(r.original)}
                      className={cn(action.variant === 'destructive' && 'text-destructive')}
                    >
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      });
    }

    return cols;
  }, [columns, selectable, rowActions, checkbox]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    getRowId,
    state: {
      sorting: sorting?.state ?? internalSorting,
      rowSelection,
      ...(pagination && {
        pagination: { pageIndex: pagination.pageIndex, pageSize: pagination.pageSize },
      }),
    },
    onSortingChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(sorting?.state ?? internalSorting) : updater;
      if (sorting) sorting.onChange(next);
      else setInternalSorting(next);
    },
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(next);
      if (onSelectionChange) {
        const selectedIds = new Set(Object.keys(next).filter((id) => next[id]));
        onSelectionChange(
          data.filter((r, i) => selectedIds.has(getRowId ? getRowId(r) : String(i))),
        );
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: !!sorting,
    ...(pagination
      ? { manualPagination: true, pageCount: pagination.pageCount ?? -1 }
      : { getPaginationRowModel: getPaginationRowModel() }),
  });

  const rows = table.getRowModel().rows;

  if (loading) {
    return <DataTableSkeleton columns={tableColumns.length} rowCount={skeletonRowCount} />;
  }

  const canPrev = pagination
    ? (pagination.hasPreviousPage ?? pagination.pageIndex > 0)
    : table.getCanPreviousPage();
  const canNext = pagination ? (pagination.hasNextPage ?? true) : table.getCanNextPage();

  return (
    <div {...container} className={cn('space-y-3', container?.className, className)}>
      {toolbar && <div className="flex items-center justify-between gap-2">{toolbar}</div>}

      {rows.length === 0 ? (
        emptyState
      ) : (
        <>
          {mobileCard && (
            <div className="space-y-2 md:hidden">
              {rows.map((r) => (
                <div
                  key={r.id}
                  onClick={() => onRowClick?.(r.original)}
                  className={cn(onRowClick && 'cursor-pointer')}
                >
                  {mobileCard(r.original)}
                </div>
              ))}
            </div>
          )}

          <div className={cn('rounded-md border border-border', mobileCard && 'hidden md:block')}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow {...row} key={hg.id}>
                      {hg.headers.map((h) => (
                        <TableHead
                          key={h.id}
                          style={{ width: h.getSize() !== 150 ? h.getSize() : undefined }}
                          className={cn(h.column.id === 'actions' && STICKY_ACTIONS_CLASS)}
                        >
                          <div
                            className={cn(
                              h.column.getCanSort() &&
                                'flex cursor-pointer items-center gap-1 select-none',
                            )}
                            onClick={h.column.getToggleSortingHandler()}
                          >
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            {h.column.getIsSorted() === 'asc' && ' ▴'}
                            {h.column.getIsSorted() === 'desc' && ' ▾'}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody {...body}>
                  {rows.map((r) => (
                    <TableRow
                      {...row}
                      key={r.id}
                      data-state={r.getIsSelected() && 'selected'}
                      onClick={() => onRowClick?.(r.original)}
                      className={cn(
                        row?.className,
                        onRowClick && 'cursor-pointer hover:bg-muted/50',
                      )}
                    >
                      {r.getVisibleCells().map((c) => (
                        <TableCell
                          {...cell}
                          key={c.id}
                          className={cn(
                            cell?.className,
                            c.column.id === 'actions' && STICKY_ACTIONS_CLASS,
                          )}
                        >
                          {flexRender(c.column.columnDef.cell, c.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {rows.length > 0 && (pagination || table.getPageCount() > 1) && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-medium text-muted-foreground">
            {pagination ? `Page ${pagination.pageIndex + 1}` : `${data.length} items`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() =>
                pagination
                  ? pagination.onPageChange(pagination.pageIndex - 1)
                  : table.previousPage()
              }
              disabled={!canPrev}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() =>
                pagination ? pagination.onPageChange(pagination.pageIndex + 1) : table.nextPage()
              }
              disabled={!canNext}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DataTableSkeleton({ columns, rowCount }: { columns: number; rowCount: number }) {
  return (
    <div className="rounded-md border border-border">
      <div className="overflow-x-auto">
        <Table>
          <TableBody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    <Skeleton
                      className="h-4"
                      style={{ width: `${60 + ((rowIndex * 7 + colIndex * 11) % 40)}%` }}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
