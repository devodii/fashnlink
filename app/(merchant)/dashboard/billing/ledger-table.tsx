'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { Receipt } from 'lucide-react';

type LedgerRow = { delta: number; reason: string; refAfter: number; createdAt: Date };

const columns: ColumnDef<LedgerRow>[] = [
  {
    id: 'delta',
    header: 'Change',
    cell: ({ row }) => (
      <span className={row.original.delta >= 0 ? 'text-success' : 'text-foreground'}>
        {row.original.delta >= 0 ? '+' : ''}
        {row.original.delta}
      </span>
    ),
  },
  {
    id: 'reason',
    header: 'Reason',
    cell: ({ row }) => <span className="capitalize">{row.original.reason.replace(/_/g, ' ')}</span>,
  },
  { id: 'balance', header: 'Balance after', cell: ({ row }) => row.original.refAfter },
  {
    id: 'date',
    header: 'Date',
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
  },
];

export function LedgerTable({ rows }: { rows: LedgerRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => `${row.createdAt.toString()}-${row.reason}-${row.delta}`}
      emptyState={<EmptyState icon={Receipt} title="No credit activity yet" />}
      mobileCard={(row) => (
        <div className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
          <span className="capitalize">{row.reason.replace(/_/g, ' ')}</span>
          <span className={row.delta >= 0 ? 'text-success' : 'text-foreground'}>
            {row.delta >= 0 ? '+' : ''}
            {row.delta}
          </span>
        </div>
      )}
    />
  );
}
