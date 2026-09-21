import { PageHeaderSkeleton } from '@/components/page-header';
import { DataTable } from '@/components/data-table';

export default function Loading() {
  return (
    <div className="space-y-6 p-4 md:p-8">
      <PageHeaderSkeleton />
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
  );
}
