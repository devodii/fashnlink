import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Kbd } from './kbd';

const meta: Meta<typeof Kbd> = {
  component: Kbd,
  title: 'components/Kbd',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof Kbd>;

export const Default: Story = { args: { children: '⌘K' } };
export const Letter: Story = { args: { children: 'Esc' } };
