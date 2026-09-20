'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState } from '@/components/empty-state';
import { InlineAlert } from '@/components/inline-alert';
import { PackageIcon } from '@phosphor-icons/react/ssr';

type ProductRow = {
  product: {
    id: string;
    title: string;
    garmentCategory: string;
    eligibility: string;
    priceCents: number | null;
  };
  hasTryonImage: boolean;
};

const ELIGIBILITY_MAP = {
  eligible: { label: 'Eligible', tone: 'success' as const },
  not_wearable: { label: 'Not wearable', tone: 'destructive' as const },
  no_usable_image: { label: 'No usable image', tone: 'warning' as const },
  kids: { label: 'Kids', tone: 'neutral' as const },
  pending: { label: 'Pending', tone: 'neutral' as const },
};

const columns: ColumnDef<ProductRow>[] = [
  { id: 'title', header: 'Product', cell: ({ row }) => row.original.product.title },
  {
    id: 'category',
    header: 'Category',
    cell: ({ row }) => (
      <span className="capitalize">{row.original.product.garmentCategory.replace('_', ' ')}</span>
    ),
  },
  {
    id: 'eligibility',
    header: 'Eligibility',
    cell: ({ row }) => (
      <StatusBadge status={row.original.product.eligibility} map={ELIGIBILITY_MAP} />
    ),
  },
  {
    id: 'image',
    header: 'Try-on image',
    cell: ({ row }) =>
      row.original.hasTryonImage ? (
        <span className="text-sm text-muted-foreground">Ready</span>
      ) : (
        <InlineAlert tone="warning" className="w-fit py-1 text-xs">
          No usable image — upload a clearer photo
        </InlineAlert>
      ),
  },
  {
    id: 'action',
    header: '',
    cell: () => (
      <Link href="/dashboard/links/new" className="text-sm text-primary hover:underline">
        Create link
      </Link>
    ),
  },
];

export function ProductsTable({ rows }: { rows: ProductRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.product.id}
      emptyState={
        <EmptyState
          icon={PackageIcon}
          title="No products yet"
          description="Create a link from a product URL to start your catalog."
        />
      }
      mobileCard={(row) => (
        <div className="space-y-1 rounded-md border border-border p-3">
          <p className="text-sm font-medium text-foreground">{row.product.title}</p>
          <div className="flex items-center justify-between">
            <StatusBadge status={row.product.eligibility} map={ELIGIBILITY_MAP} />
            <Link href="/dashboard/links/new" className="text-xs text-primary hover:underline">
              Create link
            </Link>
          </div>
        </div>
      )}
    />
  );
}
