import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { NumberTicker } from './number-ticker';
import { withReducedMotion } from './story-utils';

const meta: Meta<typeof NumberTicker> = {
  component: NumberTicker,
  title: 'components/motion/NumberTicker',
  tags: ['ai-generated'],
  args: { value: 1284 },
};
export default meta;

type Story = StoryObj<typeof NumberTicker>;

export const Default: Story = {};
export const Formatted: Story = {
  args: { value: 199, formatter: (v) => `$${v.toLocaleString()}` },
};

export const ReducedMotion: Story = {
  decorators: [withReducedMotion],
};
