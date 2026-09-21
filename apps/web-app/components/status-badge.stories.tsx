import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatusBadge } from './status-badge';

const DEMO_STATUS_MAP = {
  queued: { label: 'Queued', tone: 'neutral' as const },
  running: { label: 'Running', tone: 'warning' as const },
  succeeded: { label: 'Succeeded', tone: 'success' as const },
  failed: { label: 'Failed', tone: 'destructive' as const },
};

const meta: Meta<typeof StatusBadge> = {
  component: StatusBadge,
  title: 'components/StatusBadge',
  tags: ['ai-generated'],
  args: { map: DEMO_STATUS_MAP },
};
export default meta;

type Story = StoryObj<typeof StatusBadge>;

export const Queued: Story = { args: { status: 'queued' } };
export const Running: Story = { args: { status: 'running' } };
export const Succeeded: Story = { args: { status: 'succeeded' } };
export const Failed: Story = { args: { status: 'failed' } };
