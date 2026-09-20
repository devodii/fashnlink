import { Skeleton } from '@/components/ui/skeleton';
import { PageHeaderSkeleton, KpiRowSkeleton, TableSkeleton } from '@/components/dashboard-skeleton';

export default function Loading() {
  return (
    <div className="space-y-8 p-4 md:p-8">
      <PageHeaderSkeleton />

      <div className="space-y-4">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-20 w-full rounded-md" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <KpiRowSkeleton count={4} />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-5 w-28" />
        <TableSkeleton rows={5} />
      </div>
    </div>
  );
}
