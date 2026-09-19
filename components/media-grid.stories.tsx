import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Package } from 'lucide-react';
import { MediaGrid } from './media-grid';
import { EmptyState } from './empty-state';

const meta: Meta<typeof MediaGrid> = {
  component: MediaGrid,
  title: 'components/MediaGrid',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof MediaGrid>;

export const Default: Story = {
  args: {
    items: [
      { src: 'https://picsum.photos/seed/1/400/533', alt: 'Product 1' },
      { src: 'https://picsum.photos/seed/2/400/533', alt: 'Product 2', loading: true },
      { src: 'https://picsum.photos/seed/3/400/533', alt: 'Product 3' },
    ],
  },
};

export const Empty: Story = {
  args: {
    items: [],
    emptyState: <EmptyState icon={Package} title="No products yet" />,
  },
};

export const Mobile: Story = {
  args: Default.args,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
