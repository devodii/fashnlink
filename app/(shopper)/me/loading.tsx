import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/container';

export default function Loading() {
  return (
    <Container size="sm" className="flex flex-1 flex-col gap-6 py-6">
      <Skeleton className="h-6 w-28" />

      <div className="space-y-4">
        <Skeleton className="h-5 w-24" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="aspect-[3/4] rounded-md" />
          <Skeleton className="aspect-[3/4] rounded-md" />
          <Skeleton className="aspect-[3/4] rounded-md" />
          <Skeleton className="aspect-[3/4] rounded-md" />
        </div>
      </div>
    </Container>
  );
}
