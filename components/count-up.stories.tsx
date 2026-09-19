import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CountUp } from './count-up';

const meta: Meta<typeof CountUp> = {
  component: CountUp,
  title: 'components/CountUp',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof CountUp>;

export const Default: Story = { args: { value: 1284 } };
export const Currency: Story = {
  args: { value: 199, formatter: (v) => `$${v.toLocaleString()}` },
};
