import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { KpiRow } from './kpi-row';

const meta: Meta<typeof KpiRow> = {
  component: KpiRow,
  title: 'components/KpiRow',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof KpiRow>;

export const Default: Story = {
  args: {
    stats: [
      { label: 'Links', value: 12 },
      { label: 'Renders', value: 384, delta: 12 },
      { label: 'Shares', value: 51, delta: -4 },
      { label: 'Leads', value: 19, loading: true },
    ],
  },
};

export const Mobile: Story = {
  args: Default.args,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
