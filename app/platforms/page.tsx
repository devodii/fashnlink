import { scraperRegistry } from '@/modules/scraper';
import { Container } from '@/components/container';
import { StatusBadge } from '@/components/status-badge';

// Section 8.1: lists every supported platform (`ScraperRegistry.list()`,
// M2) with its real capabilities — never a hand-maintained duplicate list.
export default function PlatformsPage() {
  const adapters = scraperRegistry.list();

  return (
    <Container size="md" className="flex-1 space-y-8 py-16">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-medium text-foreground">Platforms we support</h1>
        <p className="text-sm text-muted-foreground">
          Don&apos;t see yours? You can still add products by uploading photos — and we&apos;re
          always adding more.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {adapters
          .filter((a) => a.key !== 'manual')
          .map((adapter) => (
            <div
              key={adapter.key}
              className="flex items-center justify-between rounded-md border border-border bg-card p-4"
            >
              <span className="text-sm font-medium text-foreground">{adapter.displayName}</span>
              <StatusBadge
                status={adapter.capabilities.has('listProducts') ? 'full' : 'basic'}
                map={{
                  full: { label: 'Full catalog', tone: 'success' },
                  basic: { label: 'Single product', tone: 'neutral' },
                }}
              />
            </div>
          ))}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Want us to add a store you use?{' '}
        <a href="/login" className="underline underline-offset-2">
          Sign up
        </a>{' '}
        and tell us during onboarding.
      </p>
    </Container>
  );
}
