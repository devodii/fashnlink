import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { InlineAlert } from './inline-alert';

const meta: Meta<typeof InlineAlert> = {
  component: InlineAlert,
  title: 'components/InlineAlert',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof InlineAlert>;

export const Destructive: Story = {
  args: {
    tone: 'destructive',
    title: 'Something went wrong',
    children: 'That link could not be created.',
  },
};

export const Success: Story = {
  args: { tone: 'success', children: 'Saved.' },
};

export const Warning: Story = {
  args: { tone: 'warning', title: 'Heads up', children: 'This product has no usable image.' },
};

export const Neutral: Story = {
  args: { children: 'Renders reset at the start of each billing cycle.' },
};

export const NotDismissible: Story = {
  args: {
    tone: 'warning',
    dismissible: false,
    children: 'This one has no close button.',
  },
};

export const DismissesOnClick: Story = {
  args: { tone: 'destructive', children: 'That link could not be created.' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Dismiss' }));
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
  },
};
