import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ProgressSteps } from './progress-steps';

const meta: Meta<typeof ProgressSteps> = {
  component: ProgressSteps,
  title: 'components/ProgressSteps',
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

type Story = StoryObj<typeof ProgressSteps>;

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
