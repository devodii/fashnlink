import { Skeleton } from '@/components/ui/skeleton';
import { PageHeaderSkeleton } from '@/components/page-header';

export default function Loading() {
  return (
    <div className="space-y-8 p-4 md:p-8">
      <PageHeaderSkeleton />

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-9 w-full rounded-md" />
          <div className="flex items-center gap-4">
            <Skeleton className="size-24 rounded-md" />
            <Skeleton className="h-64 w-32 rounded-md" />
          </div>
        </div>

        <div className="space-y-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-40" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="aspect-3/4 rounded-md" />
            <Skeleton className="aspect-3/4 rounded-md" />
            <Skeleton className="aspect-3/4 rounded-md" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Skeleton className="h-5 w-20" />
        <div className="divide-y divide-border rounded-md border border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 p-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
