'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Query client is created once per browser session via useState's lazy
 * initializer, not at module scope, so it isn't shared across requests on
 * the server and isn't recreated on every render on the client.
 *
 * Defaults favor a non-zero staleTime: most of what we fetch through React
 * Query (roster counts, poll tallies) doesn't change second-to-second, so
 * treating a fresh fetch as stale for a short window avoids redundant
 * refetches on things like tab refocus. Individual queries override this
 * where a use case genuinely needs different freshness.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <Devtools />}
    </QueryClientProvider>
  );
}

function Devtools() {
  const [Tools, setTools] = React.useState<React.ComponentType<{
    initialIsOpen?: boolean;
  }> | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    import('@tanstack/react-query-devtools').then((mod) => {
      if (!cancelled) setTools(() => mod.ReactQueryDevtools);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Tools) return null;
  return <Tools initialIsOpen={false} />;
}
