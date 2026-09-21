import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/container';

export default function Loading() {
  return (
    <Container size="sm" className="flex flex-1 flex-col gap-6 py-10">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="space-y-4 rounded-md border border-border p-4">
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
    </Container>
  );
}
