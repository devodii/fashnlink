import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Reveal } from './reveal';
import { withReducedMotion } from './story-utils';

const meta: Meta<typeof Reveal> = {
  component: Reveal,
  title: 'components/motion/Reveal',
  tags: ['ai-generated'],
  args: {
    className: 'aspect-[3/4] w-64',
    from: (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="https://picsum.photos/seed/from/400/533"
        alt="Product"
        className="size-full object-cover"
      />
    ),
    to: (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="https://picsum.photos/seed/to/400/533"
        alt="Render"
        className="size-full object-cover"
      />
    ),
  },
};
export default meta;

type Story = StoryObj<typeof Reveal>;

export const Loading: Story = { args: { revealed: false } };
export const Revealed: Story = { args: { revealed: true } };

export const ReducedMotion: Story = {
  args: { revealed: false },
  decorators: [withReducedMotion],
};
