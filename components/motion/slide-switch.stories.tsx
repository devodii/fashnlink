import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { SlideSwitch } from './slide-switch';
import { withReducedMotion } from './story-utils';

function Demo() {
  const [active, setActive] = React.useState<'a' | 'b'>('a');
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setActive('a')}>
          A
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setActive('b')}>
          B
        </Button>
      </div>
      <SlideSwitch activeKey={active}>
        <div className="rounded-md border border-border p-3 text-sm">
          Panel {active.toUpperCase()}
        </div>
      </SlideSwitch>
    </div>
  );
}

const meta: Meta<typeof Demo> = {
  component: Demo,
  title: 'components/motion/SlideSwitch',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof Demo>;

export const Default: Story = {};

export const ReducedMotion: Story = {
  decorators: [withReducedMotion],
};
