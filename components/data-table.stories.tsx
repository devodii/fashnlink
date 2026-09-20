import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ColumnDef } from '@tanstack/react-table';
import { Package } from '@phosphor-icons/react/ssr';
import { DataTable } from './data-table';
import { StatusBadge } from './status-badge';
import { EmptyState } from './empty-state';

const DEMO_STATUS_MAP = {
  queued: { label: 'Queued', tone: 'neutral' as const },
  running: { label: 'Running', tone: 'warning' as const },
  succeeded: { label: 'Succeeded', tone: 'success' as const },
  failed: { label: 'Failed', tone: 'destructive' as const },
};

interface DemoRow {
  id: string;
  title: string;
  status: keyof typeof DEMO_STATUS_MAP;
  renders: number;
}

const DEMO_ROWS: DemoRow[] = [
  { id: '1', title: 'Linen shirt', status: 'succeeded', renders: 42 },
  { id: '2', title: 'Wrap dress', status: 'running', renders: 11 },
  { id: '3', title: 'Suede loafers', status: 'queued', renders: 0 },
  { id: '4', title: 'Denim jacket', status: 'failed', renders: 3 },
];

const DEMO_COLUMNS: ColumnDef<DemoRow>[] = [
  { accessorKey: 'title', header: 'Product' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={getValue<string>()} map={DEMO_STATUS_MAP} />,
  },
  { accessorKey: 'renders', header: 'Renders' },
];

function mobileCard(row: DemoRow) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-sm font-medium text-foreground">{row.title}</p>
      <div className="mt-1 flex items-center justify-between">
        <StatusBadge status={row.status} map={DEMO_STATUS_MAP} />
        <span className="text-xs text-muted-foreground">{row.renders} renders</span>
      </div>
    </div>
  );
}

const meta: Meta<typeof DataTable<DemoRow, unknown>> = {
  component: DataTable,
  title: 'components/DataTable',
  tags: ['ai-generated'],
  args: {
    columns: DEMO_COLUMNS,
    data: DEMO_ROWS,
    getRowId: (r: DemoRow) => r.id,
    mobileCard,
  },
};
export default meta;

type Story = StoryObj<typeof DataTable<DemoRow, unknown>>;

export const Default: Story = {};

export const Loading: Story = {
  args: { isLoading: true },
};

export const Empty: Story = {
  args: {
    data: [],
    emptyState: <EmptyState icon={Package} title="No products yet" />,
  },
};

export const Mobile: Story = {
  args: Default.args,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
