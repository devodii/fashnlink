import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PackageIcon } from '@phosphor-icons/react/ssr';
import { EmptyState } from './empty-state';
import { Button } from './ui/button';

const meta: Meta<typeof EmptyState> = {
  component: EmptyState,
  title: 'components/EmptyState',
  tags: ['ai-generated'],
  args: { icon: PackageIcon, title: 'No products yet' },
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
