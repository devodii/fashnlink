import { Skeleton } from '@/components/ui/skeleton';
import { PageHeaderSkeleton } from '@/components/page-header';
import { DataTable } from '@/components/data-table';

export default function Loading() {
  return (
    <div className="space-y-8 p-4 md:p-8">
      <PageHeaderSkeleton />

      <div className="space-y-4">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-20 w-full rounded-md" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-5 w-20" />
        <DataTable
          columns={[
            { id: 'col-0', size: 200 },
            { id: 'col-1', size: 120 },
            { id: 'col-2', size: 120 },
            { id: 'col-3', size: 90 },
          ]}
          data={[]}
          isLoading
          skeletonRowCount={6}
          emptyState={null}
        />
      </div>
    </div>
  );
}
