import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/container';

export default function Loading() {
  return (
    <Container size="sm" className="flex flex-1 flex-col gap-4 py-6">
      <Skeleton className="aspect-3/4 w-full rounded-md" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-11 w-full rounded-md" />
    </Container>
  );
}
