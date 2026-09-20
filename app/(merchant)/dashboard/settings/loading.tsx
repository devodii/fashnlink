import { Skeleton } from '@/components/ui/skeleton';
import { PageHeaderSkeleton } from '@/components/dashboard-skeleton';

export default function Loading() {
  return (
    <div className="max-w-md space-y-6 p-4 md:p-8">
      <PageHeaderSkeleton />
      <div className="space-y-4">
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="size-20 rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    </div>
  );
}
