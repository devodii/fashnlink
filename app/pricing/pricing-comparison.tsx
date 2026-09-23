'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table';

interface ComparisonRow {
  feature: string;
  free: string;
  founder: string;
  starter: string;
  growth: string;
}

const ROWS: ComparisonRow[] = [
  {
    feature: 'Try-ons',
    free: '20 to start, 10/mo',
    founder: '1,000, never expire',
    starter: '300/mo',
    growth: '1,200/mo',
  },
  {
    feature: 'Active links',
    free: '1',
    founder: 'Unlimited',
    starter: 'Unlimited',
    growth: 'Unlimited',
  },
  { feature: 'Polls / group links', free: 'No', founder: 'Yes', starter: 'Yes', growth: 'Yes' },
  {
    feature: 'Watermark',
    free: 'Small watermark',
    founder: 'None',
    starter: 'None',
    growth: 'None',
  },
  {
    feature: 'Leads',
    free: 'Visible after upgrade',
    founder: 'CSV export',
    starter: 'CSV export',
    growth: 'CSV export',
  },
  {
    feature: 'Retargeting',
    free: 'No',
    founder: 'Klaviyo / Mailchimp',
    starter: 'Klaviyo / Mailchimp',
    growth: 'Klaviyo / Mailchimp',
  },
  {
    feature: 'Support',
    free: 'Community',
    founder: 'Priority',
    starter: 'Priority',
    growth: 'Priority',
  },
];

const columns: ColumnDef<ComparisonRow>[] = [
  { accessorKey: 'feature', header: '' },
  { accessorKey: 'free', header: 'Free' },
  { accessorKey: 'founder', header: 'Founder' },
  { accessorKey: 'starter', header: 'Starter' },
  { accessorKey: 'growth', header: 'Growth' },
];

export function PricingComparison() {
  return (
    <DataTable
      columns={columns}
      data={ROWS}
      emptyState={<p className="text-sm text-muted-foreground">No plans to compare</p>}
      mobileCard={(row) => (
        <div className="flex flex-col gap-2 rounded-md border border-border p-4">
          <p className="text-sm font-medium text-foreground">{row.feature}</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <dt>Free</dt>
            <dd>{row.free}</dd>
            <dt>Founder</dt>
            <dd>{row.founder}</dd>
            <dt>Starter</dt>
            <dd>{row.starter}</dd>
            <dt>Growth</dt>
            <dd>{row.growth}</dd>
          </dl>
        </div>
      )}
    />
  );
}
