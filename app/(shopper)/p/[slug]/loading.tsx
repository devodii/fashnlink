import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/container';

export default function Loading() {
  return (
    <Container size="sm" className="flex flex-1 flex-col gap-4 py-6">
      <div className="space-y-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-56" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="aspect-[3/4] rounded-md" />
        <Skeleton className="aspect-[3/4] rounded-md" />
      </div>
    </Container>
  );
}
