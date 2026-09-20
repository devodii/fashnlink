import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/container';

export default function Loading() {
  return (
    <Container size="sm" className="flex-1 space-y-6 py-16 text-center">
      <div className="space-y-2">
        <Skeleton className="mx-auto h-7 w-64" />
        <Skeleton className="mx-auto h-4 w-72" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="aspect-[3/4] rounded-md" />
        <Skeleton className="aspect-[3/4] rounded-md" />
        <Skeleton className="aspect-[3/4] rounded-md" />
        <Skeleton className="aspect-[3/4] rounded-md" />
        <Skeleton className="aspect-[3/4] rounded-md" />
        <Skeleton className="aspect-[3/4] rounded-md" />
      </div>

      <Skeleton className="mx-auto h-11 w-40 rounded-md" />
    </Container>
  );
}
