import { PageHeaderSkeleton, TableSkeleton } from '@/components/dashboard-skeleton';

export default function Loading() {
  return (
    <div className="space-y-6 p-4 md:p-8">
      <PageHeaderSkeleton />
      <TableSkeleton rows={6} />
    </div>
  );
}
