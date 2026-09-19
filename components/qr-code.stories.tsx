import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { QrCode } from './qr-code';

const meta: Meta<typeof QrCode> = {
  component: QrCode,
  title: 'components/QrCode',
  tags: ['ai-generated'],
  args: { value: 'https://example.com/t/abc123' },
};
export default meta;

type Story = StoryObj<typeof QrCode>;

export const Default: Story = {};
export const Small: Story = { args: { size: 64 } };
export const Large: Story = { args: { size: 240 } };

export const CssCheck: Story = {
  play: async ({ canvas }) => {
    const svg = canvas.getByRole('img');
    // fill="currentColor" on a text-foreground root — themes with the page
    // instead of hardcoding black modules.
    await expect(getComputedStyle(svg).color).not.toBe('rgba(0, 0, 0, 0)');
  },
};
