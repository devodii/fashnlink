import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/container';

export default function Loading() {
  return (
    <Container size="sm" className="flex flex-1 flex-col gap-4 py-6">
      <div className="space-y-1 text-center">
        <Skeleton className="mx-auto h-4 w-24" />
        <Skeleton className="mx-auto h-6 w-48" />
        <Skeleton className="mx-auto h-4 w-16" />
      </div>
      <Skeleton className="aspect-[3/4] w-full rounded-md" />
      <Skeleton className="h-11 w-full rounded-md" />
    </Container>
  );
}
