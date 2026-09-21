'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { LinkIcon } from '@phosphor-icons/react/ssr';
import { DataTable } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { InlineAlert } from '@/components/inline-alert';
import { LoadingButton } from '@/components/loading-button';
import { CopyField } from '@/components/copy-field';

type DiscoveredPathRow = {
  id: string;
  path: string;
  linkText: string | null;
  score: number;
};

export function TrackingSection({
  scriptSrc,
  discoveredPaths,
}: {
  scriptSrc: string;
  discoveredPaths: DiscoveredPathRow[];
}) {
  const [rows, setRows] = React.useState(discoveredPaths);
  const [linkingId, setLinkingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleLink(row: DiscoveredPathRow) {
    setLinkingId(row.id);
    setError(null);
    const res = await fetch(`/api/discovered-paths/${row.id}/link`, { method: 'POST' });
    const json = await res.json().catch(() => null);
    setLinkingId(null);
    if (!res.ok) {
      setError(json?.error?.message ?? "We couldn't turn that page into a link.");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  const columns: ColumnDef<DiscoveredPathRow>[] = [
    {
      id: 'path',
      header: 'Path',
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.path}</span>,
    },
    {
      id: 'linkText',
      header: 'Link text',
      cell: ({ row }) => row.original.linkText ?? '—',
    },
    {
      id: 'action',
      header: '',
      cell: ({ row }) => (
        <LoadingButton
          size="sm"
          variant="outline"
          loading={linkingId === row.original.id}
          onClick={() => handleLink(row.original)}
        >
          Create link
        </LoadingButton>
      ),
    },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Custom-site tracking</p>
        <p className="text-sm text-muted-foreground">
          Add this one line to your site to discover product pages automatically.
        </p>
      </div>

      <CopyField label="Embed snippet" value={`<script src="${scriptSrc}" async></script>`} />

      {error && <InlineAlert tone="destructive">{error}</InlineAlert>}

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Discovered pages</p>
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          emptyState={
            <EmptyState
              icon={LinkIcon}
              title="No pages discovered yet"
              description="Once the script is embedded, candidate product pages will show up here."
            />
          }
          mobileCard={(row) => (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
              <div className="space-y-1">
                <p className="font-mono text-foreground">{row.path}</p>
                {row.linkText && <p className="text-muted-foreground">{row.linkText}</p>}
              </div>
              <LoadingButton
                size="sm"
                variant="outline"
                loading={linkingId === row.id}
                onClick={() => handleLink(row)}
              >
                Create link
              </LoadingButton>
            </div>
          )}
        />
      </div>
    </div>
  );
}
