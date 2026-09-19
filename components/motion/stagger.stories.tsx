import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Stagger, StaggerItem } from './stagger';
import { withReducedMotion } from './story-utils';

function Demo() {
  return (
    <Stagger>
      {[1, 2, 3].map((n) => (
        <StaggerItem key={n} index={n}>
          <div className="rounded-md border border-border p-2 text-sm">Item {n}</div>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

const meta: Meta<typeof Demo> = {
  component: Demo,
  title: 'components/motion/Stagger',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof Demo>;

export const Default: Story = {};

export const ReducedMotion: Story = {
  decorators: [withReducedMotion],
};
