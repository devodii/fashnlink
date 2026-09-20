import type { ColumnDef } from '@tanstack/react-table';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/stat-card';
import { DataTable } from '@/components/data-table';

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-64" />
    </div>
  );
}

export function KpiRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCard key={i} label="" value={0} loading />
      ))}
    </div>
  );
}

// Widths only — header/cell renderers never run while `isLoading` is set.
const DUMMY_COLUMNS: ColumnDef<Record<string, never>, unknown>[] = [
  { id: 'col-0', size: 200 },
  { id: 'col-1', size: 120 },
  { id: 'col-2', size: 120 },
  { id: 'col-3', size: 90 },
];

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <DataTable
      columns={DUMMY_COLUMNS}
      data={[]}
      isLoading
      skeletonRowCount={rows}
      emptyState={null}
    />
  );
}
