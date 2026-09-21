import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FadeIn } from './fade-in';
import { withReducedMotion } from './story-utils';

const meta: Meta<typeof FadeIn> = {
  component: FadeIn,
  title: 'components/motion/FadeIn',
  tags: ['ai-generated'],
  args: {
    children: <p className="text-sm text-muted-foreground">Fades and settles in.</p>,
  },
};
export default meta;

type Story = StoryObj<typeof FadeIn>;

export const Default: Story = {};

export const ReducedMotion: Story = {
  decorators: [withReducedMotion],
};
