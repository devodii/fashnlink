import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ImageReveal } from './image-reveal';

const meta: Meta<typeof ImageReveal> = {
  component: ImageReveal,
  title: 'components/ImageReveal',
  tags: ['ai-generated'],
  args: { from: 'https://picsum.photos/seed/reveal/400/533', alt: 'Product' },
};
export default meta;

type Story = StoryObj<typeof ImageReveal>;

export const Loading: Story = { args: { to: null } };
export const Revealed: Story = { args: { to: 'https://picsum.photos/seed/render/400/533' } };
export const Square: Story = { args: { to: null, aspect: '1/1' } };
