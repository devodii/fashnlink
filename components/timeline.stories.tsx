import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Timeline } from './timeline';

const meta: Meta<typeof Timeline> = {
  component: Timeline,
  title: 'components/Timeline',
  tags: ['ai-generated'],
  args: {
    steps: [
      { label: 'Detect', state: 'done' },
      { label: 'Fetch', state: 'active' },
      { label: 'Images', state: 'pending' },
      { label: 'Link', state: 'pending' },
    ],
  },
};
export default meta;

type Story = StoryObj<typeof Timeline>;

export const Horizontal: Story = { args: { orientation: 'horizontal' } };
export const Vertical: Story = { args: { orientation: 'vertical' } };

export const WithError: Story = {
  args: {
    steps: [
      { label: 'Detect', state: 'done' },
      { label: 'Fetch', state: 'error' },
      { label: 'Images', state: 'pending' },
    ],
  },
};

export const Mobile: Story = {
  args: { orientation: 'vertical' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
