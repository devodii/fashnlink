import { Skeleton } from '@/components/ui/skeleton';
import { PageHeaderSkeleton } from '@/components/page-header';
import { StatCardRowSkeleton } from '@/components/stat-card';

export default function Loading() {
  return (
    <div className="space-y-8 p-4 md:p-8">
      <PageHeaderSkeleton />

      <div className="space-y-4">
        <Skeleton className="h-5 w-20" />
        <StatCardRowSkeleton count={3} />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-32 w-full rounded-md" />
      </div>
    </div>
  );
}
