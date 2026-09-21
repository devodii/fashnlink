import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ShareSheet } from './share-sheet';

const meta: Meta<typeof ShareSheet> = {
  component: ShareSheet,
  title: 'components/ShareSheet',
  tags: ['ai-generated'],
  args: { title: 'See it on you', url: 'https://example.com/r/abc123', onShare: () => {} },
};
export default meta;

type Story = StoryObj<typeof ShareSheet>;

export const Default: Story = {};
