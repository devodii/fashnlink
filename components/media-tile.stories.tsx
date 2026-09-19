import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { MediaTile } from './media-tile';

const meta: Meta<typeof MediaTile> = {
  component: MediaTile,
  title: 'components/MediaTile',
  tags: ['ai-generated'],
  args: { src: 'https://picsum.photos/seed/tile/400/533', alt: 'Product photo' },
};
export default meta;

type Story = StoryObj<typeof MediaTile>;

export const Default: Story = {};
export const Square: Story = { args: { aspect: '1/1' } };
export const Story916: Story = { name: '9/16', args: { aspect: '9/16' } };
export const Loading: Story = { args: { loading: true } };

export const WithOverlay: Story = {
  args: { overlay: <span className="text-xs text-white">Preview</span> },
};

export const CssCheck: Story = {
  args: { className: 'w-40' },
  play: async ({ canvas }) => {
    const img = canvas.getByAltText('Product photo');
    await expect(getComputedStyle(img).objectFit).toBe('cover');
  },
};
