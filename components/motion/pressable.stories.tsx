import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Pressable } from './pressable';
import { withReducedMotion } from './story-utils';

const meta: Meta<typeof Pressable> = {
  component: Pressable,
  title: 'components/motion/Pressable',
  tags: ['ai-generated'],
  args: {
    className: 'w-fit rounded-md border border-border p-3 text-sm',
    children: 'Press me',
  },
};
export default meta;

type Story = StoryObj<typeof Pressable>;

export const Default: Story = {};

export const ReducedMotion: Story = {
  decorators: [withReducedMotion],
};
