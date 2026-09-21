import Link from 'next/link';
import { Container } from '@/components/container';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <Container
      size="sm"
      className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center"
    >
      <h1 className="text-2xl font-medium text-foreground">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Button asChild>
        <Link href="/">Go home</Link>
      </Button>
    </Container>
  );
}
