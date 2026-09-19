import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Package } from 'lucide-react';
import { EmptyState } from './empty-state';
import { Button } from './ui/button';

const meta: Meta<typeof EmptyState> = {
  component: EmptyState,
  title: 'components/EmptyState',
  tags: ['ai-generated'],
  args: { icon: Package, title: 'No products yet' },
};
export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {};

export const WithDescription: Story = {
  args: { description: 'Paste a product URL to get started.' },
};

export const WithAction: Story = {
  args: {
    description: 'Paste a product URL to get started.',
    action: <Button type="button">Add product</Button>,
  },
};
