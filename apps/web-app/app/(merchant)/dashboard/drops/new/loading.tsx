import { Skeleton } from '@/components/ui/skeleton';
import { PageHeaderSkeleton } from '@/components/page-header';

export default function Loading() {
  return (
    <div className="space-y-6 p-4 md:p-8">
      <PageHeaderSkeleton />

      <ul className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 rounded-md border border-border p-3">
            <Skeleton className="size-4 rounded-sm" />
            <Skeleton className="h-4 w-40" />
          </li>
        ))}
      </ul>

      <Skeleton className="h-9 w-40 rounded-md" />
    </div>
  );
}
