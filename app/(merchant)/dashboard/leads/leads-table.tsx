'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Users, Download } from '@phosphor-icons/react/ssr';

type LeadRow = {
  email: string;
  productTitle: string;
  source: string;
  createdAt: Date;
  count: number;
};

const columns: ColumnDef<LeadRow>[] = [
  { id: 'email', header: 'Email', cell: ({ row }) => row.original.email },
  { id: 'product', header: 'Product', cell: ({ row }) => row.original.productTitle },
  {
    id: 'source',
    header: 'Source',
    cell: ({ row }) => <span className="capitalize">{row.original.source.replace('_', ' ')}</span>,
  },
  { id: 'count', header: 'Renders', cell: ({ row }) => row.original.count },
  {
    id: 'date',
    header: 'First render',
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
];

function downloadCsv(rows: LeadRow[]) {
  const header = ['email', 'product', 'source', 'renders', 'first_render'];
  const lines = rows.map((r) =>
    [r.email, r.productTitle, r.source, r.count, new Date(r.createdAt).toISOString()]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  );
  const csv = [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'leads.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function LeadsTable({ rows }: { rows: LeadRow[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadCsv(rows)}
          disabled={rows.length === 0}
        >
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => `${row.email}:${row.productTitle}`}
        emptyState={<EmptyState icon={Users} title="No leads yet" />}
        mobileCard={(row) => (
          <div className="space-y-1 rounded-md border border-border p-3 text-sm">
            <p className="font-medium text-foreground">{row.email}</p>
            <p className="text-muted-foreground">{row.productTitle}</p>
          </div>
        )}
      />
    </div>
  );
}
