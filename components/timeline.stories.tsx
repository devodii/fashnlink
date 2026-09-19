import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Timeline } from './timeline';

const meta: Meta<typeof Timeline> = {
  component: Timeline,
  title: 'components/Timeline',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof Timeline>;

export const Default: Story = {
  args: {
    items: [
      { at: '2m ago', title: 'Render succeeded', tone: 'success' },
      { at: '5m ago', title: 'Render queued', tone: 'neutral' },
      {
        at: '1h ago',
        title: 'Render failed',
        description: 'Provider timeout',
        tone: 'destructive',
      },
    ],
  },
};

export const Empty: Story = { args: { items: [] } };
