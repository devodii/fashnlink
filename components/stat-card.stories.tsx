import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatCard } from './stat-card';

const meta: Meta<typeof StatCard> = {
  component: StatCard,
  title: 'components/StatCard',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof StatCard>;

export const Default: Story = { args: { label: 'Links', value: 12 } };
export const PositiveDelta: Story = { args: { label: 'Renders', value: 384, delta: 12 } };
export const NegativeDelta: Story = { args: { label: 'Shares', value: 51, delta: -4 } };
export const WithHint: Story = { args: { label: 'Leads', value: 19, hint: 'Last 30 days' } };
export const Loading: Story = { args: { label: 'Leads', value: 0, loading: true } };
