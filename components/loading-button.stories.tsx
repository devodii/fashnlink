import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { LoadingButton } from './loading-button';

const meta: Meta<typeof LoadingButton> = {
  component: LoadingButton,
  title: 'components/LoadingButton',
  tags: ['ai-generated'],
  args: { children: 'Save' },
};
export default meta;

type Story = StoryObj<typeof LoadingButton>;

export const Default: Story = {};
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };
