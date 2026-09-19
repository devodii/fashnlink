import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ImageCompare } from './image-compare';

const meta: Meta<typeof ImageCompare> = {
  component: ImageCompare,
  title: 'components/ImageCompare',
  tags: ['ai-generated'],
  args: {
    before: 'https://picsum.photos/seed/before/400/533',
    after: 'https://picsum.photos/seed/after/400/533',
    alt: 'Before and after',
  },
};
export default meta;

type Story = StoryObj<typeof ImageCompare>;

export const Default: Story = {};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
