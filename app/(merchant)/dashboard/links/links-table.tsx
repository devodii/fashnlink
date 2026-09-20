'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState } from '@/components/empty-state';
import { Link as LinkIcon } from '@phosphor-icons/react/ssr';

type LinkRow = {
  link: {
    id: string;
    slug: string;
    kind: 'single' | 'poll' | 'group';
    status: 'active' | 'paused' | 'archived';
    viewCount: number;
    renderCount: number;
    createdAt: Date;
  };
  productTitle: string | null;
};

const STATUS_MAP = {
  active: { label: 'Active', tone: 'success' as const },
  paused: { label: 'Paused', tone: 'warning' as const },
  archived: { label: 'Archived', tone: 'neutral' as const },
};

const columns: ColumnDef<LinkRow>[] = [
  {
    id: 'product',
    header: 'Product',
    cell: ({ row }) => (
      <Link
        href={`/dashboard/links/${row.original.link.id}`}
        className="font-medium hover:underline"
      >
        {row.original.productTitle ?? row.original.link.slug}
      </Link>
    ),
  },
  {
    id: 'kind',
    header: 'Kind',
    cell: ({ row }) => <span className="capitalize">{row.original.link.kind}</span>,
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.link.status} map={STATUS_MAP} />,
  },
  { id: 'views', header: 'Views', cell: ({ row }) => row.original.link.viewCount },
  { id: 'renders', header: 'Renders', cell: ({ row }) => row.original.link.renderCount },
];

export function LinksTable({ rows }: { rows: LinkRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.link.id}
      emptyState={
        <EmptyState
          icon={LinkIcon}
          title="No links yet"
          description="Paste a product URL to create your first try-on link."
        />
      }
      mobileCard={(row) => (
        <Link
          href={`/dashboard/links/${row.link.id}`}
          className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {row.productTitle ?? row.link.slug}
            </p>
            <p className="text-xs text-muted-foreground">
              {row.link.renderCount} renders · {row.link.viewCount} views
            </p>
          </div>
          <StatusBadge status={row.link.status} map={STATUS_MAP} />
        </Link>
      )}
    />
  );
}
