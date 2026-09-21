import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { Dot } from './dot';

const meta: Meta<typeof Dot> = {
  component: Dot,
  title: 'components/Dot',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof Dot>;

export const Neutral: Story = {
  args: { tone: 'neutral' },
};

export const Success: Story = {
  args: { tone: 'success' },
};

export const Warning: Story = {
  args: { tone: 'warning' },
};

export const Destructive: Story = {
  args: { tone: 'destructive' },
};

// Proves the shared preview actually loads app/globals.css and Tailwind's
// utility classes resolve to real computed styles, not an unstyled shell.
export const CssCheck: Story = {
  args: { tone: 'destructive' },
  play: async ({ canvasElement }) => {
    const dot = canvasElement.querySelector('span');
    if (!dot) throw new Error('Dot span not found');
    const style = getComputedStyle(dot);
    // rounded-full compiles to `calc(infinity * 1px)` in Tailwind v4, which
    // Chromium resolves to a large finite value, not a literal '9999px'.
    await expect(Number.parseFloat(style.borderRadius)).toBeGreaterThan(1000);
    await expect(style.width).toBe('8px');
    await expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  },
};
