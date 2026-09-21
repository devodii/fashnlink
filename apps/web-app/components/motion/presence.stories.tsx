import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Presence } from './presence';

function Demo() {
  const [key, setKey] = React.useState<'a' | 'b'>('a');
  return (
    <div className="space-y-3">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setKey((k) => (k === 'a' ? 'b' : 'a'))}
      >
        Toggle
      </Button>
      <Presence mode="wait">
        <div key={key} className="rounded-md border border-border p-3 text-sm">
          Panel {key.toUpperCase()}
        </div>
      </Presence>
    </div>
  );
}

const meta: Meta<typeof Demo> = {
  component: Demo,
  title: 'components/motion/Presence',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof Demo>;

export const Default: Story = {};
